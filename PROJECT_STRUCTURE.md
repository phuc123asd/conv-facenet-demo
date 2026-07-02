# Project Structure Review

## Truoc Khi Sap Xep

- Web React nam o thu muc goc.
- `conv-facenet` nam chung cap voi web, gom ca source model, notebook, weights, `.venv`, `.git`.
- Chua co backend rieng de noi web voi model nhan dien.
- Chua co schema database cho Supabase.

## Sau Khi Sap Xep

```text
frontend/                  # Web React hien tai
backend/                   # FastAPI API
face-service/conv-facenet/ # Du an nhan dien guong mat hien co
database/supabase/         # SQL migration
```

## Ly Do

- Frontend khong nen import truc tiep model AI.
- Backend giu nghiep vu diem danh, phan quyen, bao cao va ket noi database.
- Face service giu model/doc lap, de sau nay co the tach thanh microservice GPU.
- Database migration dat rieng de quan ly thay doi schema ro rang.

## Buoc Nang Cap Tiep Theo

1. Ket noi backend voi Supabase.
2. Them API nhan vien, ca lam, lich su diem danh.
3. Luu face embedding vao `face_profiles`.
4. Cho frontend goi backend thay vi data demo.
5. Tach `conv-facenet` thanh service rieng neu can GPU hoac nhieu kiosk.
