-- Additive only. Preserves all existing rows.
-- ApplyRequest: payment timestamp + founder notes
ALTER TABLE "ApplyRequest" ADD COLUMN IF NOT EXISTS "paymentAt" TIMESTAMP(3);
ALTER TABLE "ApplyRequest" ADD COLUMN IF NOT EXISTS "founderNote" TEXT;

-- ApplyDocument: private storage metadata
ALTER TABLE "ApplyDocument" ADD COLUMN IF NOT EXISTS "storageProvider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "ApplyDocument" ADD COLUMN IF NOT EXISTS "objectKey" TEXT;

-- Activity log for founder review trail
CREATE TABLE IF NOT EXISTS "ApplyActivity" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplyActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ApplyActivity_requestId_idx" ON "ApplyActivity"("requestId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ApplyActivity_requestId_fkey'
  ) THEN
    ALTER TABLE "ApplyActivity"
      ADD CONSTRAINT "ApplyActivity_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "ApplyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
