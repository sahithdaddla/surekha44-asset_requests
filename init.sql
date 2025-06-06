CREATE TABLE asset_requests (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(40) NOT NULL CHECK (LENGTH(TRIM(employee_name)) >= 5),
    employee_id VARCHAR(7) NOT NULL CHECK (employee_id ~ '^ATS0[0-9]{3}$'),
    asset_type VARCHAR(50) NOT NULL,
    other_asset_name VARCHAR(30),
    reason TEXT NOT NULL CHECK (LENGTH(TRIM(reason)) >= 5 AND LENGTH(TRIM(reason)) <= 300),
    request_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_employee_id ON asset_requests(employee_id);
CREATE INDEX idx_status ON asset_requests(status);
CREATE INDEX idx_employee_name ON asset_requests(employee_name);
