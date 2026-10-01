# GlazeStack V1

Database trực quan về **hiệu ứng chồng nhiều lớp men gốm** — có thứ tự lớp rõ ràng, có nguồn gốc (provenance), có sổ tay thí nghiệm cá nhân, và có bộ đề xuất phối men dựa trên bằng chứng.

> VISUAL KNOWLEDGE BASE + PERSONAL CERAMIC LAB NOTEBOOK + EVIDENCE-BASED GLAZE RECOMMENDER — ba phần dùng chung **một** database.

- **Discover**: gallery recipe, filter (brand, glaze, series, màu, hiệu ứng, bề mặt, cone, atmosphere, clay, số glaze, số lớp, movement, run risk, verified, My Glazes, đã tự test), search tự nhiên EN/VI (“men xanh rêu loang nâu”).
- **Recipe detail**: layer stack TOP → CLAY, firing, behavior, dinnerware suitability, nguồn, experiment cá nhân, recipe liên quan, **Save / Test this combo / Create variation**.
- **My Lab**: experiment clone từ recipe (không sửa recipe gốc), upload ảnh kết quả, rating, success/failure, result tags, **Promote to Personal Recipe**.
- **My Glazes**: inventory lọ men đang có → dùng cho recommendation.
- **Ask GlazeStack**: mô tả bằng chữ và/hoặc ảnh tham khảo → 6 đề xuất chia *Closest / Safe / Experimental*, kèm lý do, evidence và run risk. Chỉ trả recipe **có trong database**.
- **Import Reference**: URL / text / screenshot → draft → review từng field → *Approve & Create Recipe*, có phát hiện trùng lặp (merge source / tạo variation riêng).
- **Compare** 2–4 recipe, **Sources**, **Brands**, **Glaze Library**, **Admin** (brands, series, glazes, recipes, sources, users).

---

## Kiến trúc

```text
Browser ──► Next.js 16 (App Router, Netlify) ──► Supabase (Postgres + Auth + Storage, RLS)
             │  Server Components: đọc dữ liệu bằng session của user (RLS áp dụng)
             │  Server Actions: ghi dữ liệu bằng session của user (RLS áp dụng)
             │  lib/recommendation: engine deterministic thuần TypeScript
             └─ lib/ai: AIProvider tuỳ chọn (server-only)
Browser ──► Supabase Storage: upload ảnh trực tiếp (Storage RLS theo thư mục user)
```

| Thư mục | Vai trò |
|---|---|
| `app/` | Routes (App Router). Page chỉ ghép UI, không chứa business logic. |
| `components/` | UI primitives (button, form, sheet…) + app shell (sidebar / bottom nav). |
| `features/` | Component + server actions theo tính năng (recipes, lab, inventory, ask, imports, admin, media, auth, discover). |
| `lib/data/` | Truy vấn Supabase (server-only). |
| `lib/recommendation/` | Intent parser, hard filters, scoring (`scoring.ts`), diversity, giải thích. Có unit test. |
| `lib/ai/` | `AIProvider` interface + implementation Anthropic, schema zod cho structured output. |
| `lib/ask/` | Orchestration của Ask: intent → filter → score → (AI rerank). |
| `lib/vocabulary.ts` | Từ vựng tag chuẩn + lexicon EN/VI cho search. |
| `lib/i18n/` | UI song ngữ EN/VI: `en.ts`/`vi.ts` cùng shape `Messages`; server dùng `getCopy()`, client dùng `useCopy()`. Ngôn ngữ lấy từ cookie `glazestack_locale`, mặc định theo `Accept-Language`; nút EN/VI ở sidebar và header mobile. |
| `types/` | Domain types (`Brand`, `Glaze`, `Recipe`, `RecipeLayer`, `Experiment`, `RecommendationCandidate`, `VisualIntent`…). |
| `supabase/migrations/` | Schema, RLS, storage buckets, RPC. |
| `supabase/seed.sql` | Dữ liệu demo. |
| `supabase/phase2/` | pgvector (chưa áp dụng ở V1). |

### Quyết định thiết kế chính

- **Không có backend riêng, không Edge Function bắt buộc.** CRUD dùng Supabase client + RLS. Những việc cần secret (AI) chạy trong Server Actions của Next.js trên Netlify — key không bao giờ ra browser. Vì thế V1 không cần deploy Edge Functions; nếu sau này cần job nền thì thêm vào `supabase/functions/`.
- **Service role key không được app dùng.** Mọi thao tác chạy dưới session của user, RLS là lớp bảo vệ thật sự. `SUPABASE_SERVICE_ROLE_KEY` chỉ để dành cho script quản trị.
- **Layer lưu theo thứ tự application** (`layer_position` 1 = lớp đầu tiên trên clay). UI hiển thị từ trên xuống. “A over B” ≠ “B over A”. Thay layers bằng RPC `replace_recipe_layers` / `replace_experiment_layers` (một transaction, `SECURITY INVOKER` nên RLS vẫn áp dụng).
- **Provenance chuẩn hoá**: bảng `sources` + `recipe_sources` (một recipe có nhiều nguồn). Trên `recipes` chỉ giữ `source_type` và `verification_status` làm tóm tắt để filter/score.
- **Cột derived trên `recipes`** (`glaze_ids`, `brand_ids`, `series_names`, `layer_count`, `glaze_count`, `all_tags`, `search_doc`) do trigger duy trì → Discover lọc bằng toán tử PostgREST thường (`ov`, `cs`, `cd`) + GIN/trigram index, không cần Elasticsearch.
- **Recipe public vs private**: user thường chỉ tạo recipe **private** (personal, variation, import). Editor/admin tạo recipe **public** (mặc định là draft cho tới khi publish). Recipe community/manufacturer không bao giờ bị sửa tại chỗ — người dùng tạo variation.
- **Vocabulary mở**: `glaze_type`, tag màu/hiệu ứng là text tự do; UI gợi ý từ `lib/vocabulary.ts`. Brand/series là dữ liệu, không hard-code.
- **Search tự nhiên** (V1): `parseTextIntent` map cụm từ EN/VI → tag (longest match, có phủ định “không/tránh/no”), từ còn lại → trigram `ilike` trên `search_doc`, sau đó xếp hạng trong bộ nhớ. Không cần vector search.
- **Ảnh**: không lưu binary trong Postgres. Ảnh kết quả experiment, recipe cá nhân, ảnh tham khảo Ask, screenshot import → bucket private, hiển thị bằng signed URL. Ảnh tham khảo được thu nhỏ trong browser (≤1600px JPEG) trước khi upload.
- **Khi chưa có ảnh nung thật**, card hiển thị “tile minh hoạ” vẽ từ swatch và ghi rõ *Illustration — not a fired result*.
- **Food safety**: không bao giờ suy luận. `dinnerware_suitability` mặc định `unknown`; claim food-safe của glaze chỉ ghi khi hãng tuyên bố; UI luôn nhắc rằng an toàn của từng glaze không chuyển sang combination.
- **UI tự viết** (button, form, chip, sheet bằng `<dialog>` native) thay cho shadcn/Radix để giữ ít dependency; mobile dùng bottom nav 5 tab + bottom sheet, desktop dùng sidebar cố định.

---

## Recommendation Engine (V1)

```text
USER REQUEST → NORMALIZE INTENT → HARD FILTER → CANDIDATES → SCORE → DIVERSIFY → (AI RERANK) → RESULTS
```

- **Intent**: parser deterministic luôn chạy; nếu có AI, kết quả AI (đã lọc về vocabulary chuẩn) được merge thêm. Ảnh tham khảo → AI chỉ mô tả *thuộc tính thị giác* (JSON), không bao giờ đoán tên men.
- **Hard filters** (`filters.ts`): cone ngoài tolerance (±1, cấu hình được), glaze có dải cone không phù hợp, Only My Glazes, allowed glazes, brand bị loại, vượt số glaze / số lớp, atmosphere bắt buộc, màu dominant nằm trong “avoid”, risk tolerance thấp mà run risk cao.
- **Scoring** (`scoring.ts`, trọng số ở `config.ts`): 35% visual/effect · 25% màu · 15% inventory · 10% firing · 10% evidence · 5% lịch sử cá nhân, trừ penalty (màu cần tránh ở màu phụ, run risk vượt tolerance, glaze user đã ≥2 lần đánh dấu `too_runny`), cộng nhẹ cho brand ưu tiên.
- **Diversity** (`diversify.ts`): MMR trên độ tương đồng glaze/màu/hiệu ứng → 6 kết quả chia Closest / Safe / Experimental.
- **Không đủ dữ liệu** → hiển thị “No close documented match found.” và đánh dấu rõ các gợi ý experimental.
- **AI rerank** (tuỳ chọn) chỉ được **sắp xếp lại** các id có sẵn và viết một câu giải thích ngắn; id lạ bị bỏ qua.

“Số màu mong muốn” và “số glaze tối đa” là hai biến riêng (`desiredColorCount` vs `maxGlazes`).

---

## Cài đặt local

Yêu cầu: Node.js ≥ 20.9 (khuyến nghị 22), một Supabase project (hosted hoặc local bằng Supabase CLI).

```bash
npm install
cp .env.example .env.local      # điền URL + publishable key
npm run dev                     # http://localhost:4310
```

Các script:

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Build & chạy production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Sinh route types + `tsc` |
| `npm test` | Unit test (Vitest) cho recommendation, intent parser, import matching |

Nếu thiếu env Supabase, app vẫn chạy và hiển thị hướng dẫn cấu hình thay vì trang trắng.

## Supabase setup

1. Tạo project tại <https://supabase.com> → **Project Settings → API**: lấy *Project URL* và *publishable (anon) key*.
2. Chạy migrations (tạo bảng, constraint, index, trigger, RLS, policies, storage buckets, RPC):

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --include-seed      # bỏ --include-seed nếu không muốn dữ liệu demo
   ```

   Không dùng CLI? Mở **SQL Editor** và chạy lần lượt các file trong `supabase/migrations/` theo thứ tự tên, rồi `supabase/seed.sql`.

3. **Storage**: migration `…_storage.sql` tự tạo 3 bucket và policy:

   | Bucket | Public | Dùng cho | Ai được ghi |
   |---|---|---|---|
   | `public-glaze-assets` | ✓ | ảnh sản phẩm | editor/admin |
   | `public-recipe-assets` | ✓ | ảnh kết quả recipe public | editor/admin |
   | `private-user-assets` | ✗ | ảnh experiment, recipe cá nhân, ảnh Ask, screenshot import | chỉ chủ sở hữu, đường dẫn bắt buộc bắt đầu bằng `<user_id>/` |

4. **Auth**: Authentication → URL Configuration
   - *Site URL*: URL Netlify của bạn (vd. `https://glazestack.netlify.app`)
   - *Redirect URLs*: thêm `https://<site>/auth/confirm` và `http://localhost:4310/auth/confirm`
   - Email/password và Magic Link đều dùng route `/auth/confirm` (hỗ trợ cả `token_hash` lẫn PKCE `code`).

5. **Tạo admin đầu tiên**: đăng ký tài khoản trong app, rồi chạy trong SQL Editor:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

   Sau đó admin cấp quyền `editor`/`admin` cho người khác ở **Admin → Users**.

### Chạy Supabase local (tuỳ chọn, cần Docker)

```bash
npx supabase start          # áp dụng migrations + seed, in ra API URL và publishable key
npx supabase db reset       # xoá dữ liệu local và chạy lại migrations + seed
```

Điền `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421` và publishable key được in ra vào `.env.local`. Local stack tắt email confirmation nên đăng ký xong là đăng nhập luôn. Nếu mạng chặn registry mặc định (ECR), dùng `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start`.

### Seed data

`supabase/seed.sql` (idempotent) tạo 6 brand (AMACO, Mayco, Coyote, Spectrum, Laguna, “Studio House (demo)”), series theo spec, 25 glaze và 12 recipe minh hoạ. **Đây là dữ liệu demo**: tên dòng men theo các line thương mại phổ biến, nhưng màu/cone/finish là gần đúng, product code để trống nếu không chắc, không ghi bất kỳ claim food-safe nào, và mọi recipe gắn nguồn “GlazeStack demo seed” với trạng thái `unverified`. Hãy thay bằng dữ liệu có nguồn thật.

## Environment variables

| Biến | Bắt buộc | Phạm vi | Ghi chú |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | browser + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✓ | browser + server | publishable/anon key (an toàn cho browser; `NEXT_PUBLIC_SUPABASE_ANON_KEY` cũng được chấp nhận) |
| `NEXT_PUBLIC_SITE_URL` | khuyến nghị | server | URL dùng cho link email. Trên Netlify nếu bỏ trống sẽ dùng biến `URL` của Netlify |
| `SUPABASE_SERVICE_ROLE_KEY` | ✗ | server-only | App V1 **không** dùng. Không bao giờ đặt tiền tố `NEXT_PUBLIC_` |
| `AI_PROVIDER` | ✗ | server-only | `anthropic` (mặc định khi có key) |
| `AI_MODEL` | ✗ | server-only | mặc định `claude-opus-5-5` |
| `AI_API_KEY` | ✗ | server-only | để trống → app chạy không AI |

## Deploy lên Netlify

1. Push repo lên GitHub.
2. Netlify → **Add new site → Import from Git** → chọn repo. Netlify tự nhận Next.js (`netlify.toml` đã khai báo build command, Node 22).
3. **Site configuration → Environment variables**: thêm các biến ở bảng trên (tối thiểu 2 biến Supabase + `NEXT_PUBLIC_SITE_URL`).
4. Deploy. Cập nhật *Site URL* / *Redirect URLs* trong Supabase Auth theo domain Netlify.

Ghi chú: mọi trang render theo request (dữ liệu phụ thuộc user/RLS), build không cần kết nối database.

## AI (tuỳ chọn)

Đặt `AI_API_KEY` (và tuỳ chọn `AI_MODEL`). Khi có AI:

- Ask: phân tích text thành tag chuẩn, phân tích ảnh tham khảo (chỉ thuộc tính thị giác, JSON có schema), rerank + câu giải thích ngắn.
- Import: gợi ý trích xuất brand/glaze/thứ tự lớp/coat/cone/clay/tag — **không tự publish**, tên men được map vào glaze có thật; tên không khớp được báo để người duyệt chọn.

Khi không có AI: search dùng keyword/tag matching, Ask hiển thị “AI image analysis is not configured.”, Import điền tay. Lỗi AI (timeout, từ chối…) không làm hỏng request — app rơi về kết quả deterministic.

Implementation dùng SDK chính thức `@anthropic-ai/sdk` với structured outputs (zod) và server-side fallback khi model từ chối. Request AI có timeout 25s để nằm trong giới hạn serverless function của Netlify; với gói Netlify có timeout ngắn hơn, cân nhắc model nhanh hơn qua `AI_MODEL`. Thêm provider khác: implement `AIProvider` trong `lib/ai/<tên>.ts` và thêm vào `lib/ai/index.ts`.

## Bảo mật

- RLS bật cho **mọi** bảng. Tóm tắt:
  - Catalog (brands, series, glazes): ai cũng đọc; editor ghi; admin xoá.
  - Recipe public + published: ai cũng đọc (kể cả chưa đăng nhập). Draft public: chỉ editor. Recipe private: chỉ chủ sở hữu.
  - Experiments, inventory, saved, imports, ask history: chỉ chủ sở hữu.
  - Profiles: user sửa profile của mình nhưng **không** đổi được role (trigger chặn); chỉ admin đổi role.
  - Media: đọc được khi đối tượng sở hữu (recipe/experiment) đọc được — tận dụng RLS lồng nhau.
- Storage private: path phải bắt đầu bằng `auth.uid()`; server action kiểm tra lại prefix trước khi đăng ký media.
- Server Actions luôn tự kiểm tra auth, không dựa vào `proxy.ts` (proxy chỉ refresh session và chuyển hướng trang cần đăng nhập).
- Redirect sau login chỉ chấp nhận đường dẫn tương đối nội bộ.
- Service role key và AI key chỉ ở server; không commit key thật (`.env*` đã bị ignore, trừ `.env.example`).

## Kiểm thử

- `npm test`: 22 unit test — cone mismatch, inventory-only, giới hạn số glaze/số lớp, brand bị loại, atmosphere bắt buộc, chấm điểm màu/hiệu ứng, bonus evidence, lịch sử cá nhân (rating cao, `too_runny`), brand ưu tiên, parser EN/VI (phủ định, “không chảy”), diversity, khớp tên men khi import.
- Migrations + seed + RLS đã được chạy thử trên Postgres 16 (anon / user A / user B / editor / leo thang role / cascade delete / RPC layers).

## Giới hạn đã biết của V1

- Nội dung dữ liệu (tên men, mô tả công thức trong seed) chưa có bản dịch — chỉ giao diện và nhãn từ vựng được song ngữ. URL không tách theo ngôn ngữ (không có `/vi/...`).
- Discover search xếp hạng tối đa 200 ứng viên đầu tiên trong bộ nhớ; đủ cho V1, Phase 2 chuyển sang full-text/vector.
- Recommendation tải tối đa 500 recipe mỗi lần hỏi.
- Import draft chỉ người tạo xem được (kể cả admin) — đúng với RLS “owner only”.
- Recipe editor dùng nút Up/Down (chạy tốt trên mobile) thay vì drag & drop.

## Lộ trình

Phase 2 vector search (`supabase/phase2/recipe_embeddings.sql`) · Phase 3 public-source import tự động · Phase 4 đóng góp cộng đồng · Phase 5 học từ experiment cá nhân · Phase 6 hoá học men · Phase 7 database dùng chung cho studio.
