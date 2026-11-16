-- Baseline compatible with the original accounting schema.
CREATE TABLE app_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE contracts (
      contract_id text PRIMARY KEY,
      contractor text NOT NULL,
      amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
      signed_at date NOT NULL
    );
    CREATE TABLE works (
      work_id text PRIMARY KEY,
      contract_id text NOT NULL REFERENCES contracts(contract_id),
      title text NOT NULL,
      price_cents bigint NOT NULL CHECK (price_cents >= 0),
      status text NOT NULL CHECK (status IN ('planned', 'done', 'cancelled')),
      completed_at date,
      cancelled_at date,
      UNIQUE (work_id, contract_id),
      CHECK (
        (status = 'planned' AND completed_at IS NULL AND cancelled_at IS NULL) OR
        (status = 'done' AND completed_at IS NOT NULL AND cancelled_at IS NULL) OR
        (status = 'cancelled' AND completed_at IS NULL AND cancelled_at IS NOT NULL)
      )
    );
    CREATE TABLE payments (
      payment_id text PRIMARY KEY,
      contract_id text NOT NULL REFERENCES contracts(contract_id),
      work_id text,
      purpose text NOT NULL,
      amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
      status text NOT NULL CHECK (status IN ('paid', 'queued', 'refunded')),
      created_at date NOT NULL,
      paid_at date,
      refunded_at date,
      FOREIGN KEY (work_id, contract_id) REFERENCES works(work_id, contract_id)
        DEFERRABLE INITIALLY DEFERRED,
      CHECK (refunded_at IS NULL OR refunded_at >= paid_at),
      CHECK (
        (status = 'queued' AND paid_at IS NULL AND refunded_at IS NULL) OR
        (status = 'paid' AND paid_at IS NOT NULL AND refunded_at IS NULL) OR
        (status = 'refunded' AND paid_at IS NOT NULL AND refunded_at IS NOT NULL)
      )
    );
    CREATE INDEX works_contract_idx ON works(contract_id);
    CREATE INDEX payments_contract_idx ON payments(contract_id);
    CREATE INDEX payments_work_idx ON payments(work_id, contract_id);
