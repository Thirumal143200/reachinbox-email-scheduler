-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "SlackConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "google_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "senders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "senders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "EmailStatus" NOT NULL DEFAULT 'SCHEDULED',
    "job_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "ethereal_preview_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slack_team_id" TEXT,
    "slack_team_name" TEXT,
    "slack_user_id" TEXT,
    "slack_channel_id" TEXT,
    "encrypted_access_token" TEXT NOT NULL,
    "status" "SlackConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "senders_user_id_idx" ON "senders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "senders_user_id_email_key" ON "senders"("user_id", "email");

-- CreateIndex
CREATE INDEX "emails_user_id_status_idx" ON "emails"("user_id", "status");

-- CreateIndex
CREATE INDEX "emails_scheduled_at_idx" ON "emails"("scheduled_at");

-- CreateIndex
CREATE INDEX "emails_sender_id_scheduled_at_idx" ON "emails"("sender_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "emails_idempotency_key_key" ON "emails"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "slack_connections_user_id_key" ON "slack_connections"("user_id");

-- AddForeignKey
ALTER TABLE "senders" ADD CONSTRAINT "senders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "senders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;