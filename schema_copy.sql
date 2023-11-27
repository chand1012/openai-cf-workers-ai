
DROP TABLE IF EXISTS threads;
CREATE TABLE threads (
	id SERIAL PRIMARY KEY,
	created_at TIMESTAMP DEFAULT NOW,
	metadata TEXT
);

-- schema goes here
-- DROP TABLE IF EXISTS assistants;
-- CREATE TABLE assistants (
-- 		id SERIAL PRIMARY KEY,
-- 		name TEXT,
-- 		description TEXT,
-- 		created_at TIMESTAMP DEFAULT NOW(),
-- 		model TEXT,
-- 		instructions TEXT,
-- 		tools TEXT, -- treat as JSON
-- 		file_ids TEXT, -- treat as JSON
-- 		metadata TEXT -- treat as JSON
-- );

DROP TABLE IF EXISTS runs;
CREATE TABLE runs (
	id SERIAL PRIMARY KEY,
	assistant_id INTEGER REFERENCES assistants(id) NOT NULL,
	thread_id INTEGER REFERENCES threads(id) NOT NULL,
	created_at TIMESTAMP DEFAULT NOW(),
	status TEXT NOT NULL,
	required_action TEXT, -- treat as JSON
	last_error TEXT, -- treat as JSON
	expires_at TIMESTAMP NOT NULL,
	started_at TIMESTAMP,
	cancelled_at TIMESTAMP,
	failed_at TIMESTAMP,
	completed_at TIMESTAMP,
	model TEXT NOT NULL,
	instructions TEXT NOT NULL,
	tools TEXT, -- treat as JSON
	file_ids TEXT, -- treat as JSON
	metadata TEXT -- treat as JSON
);


DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
	id SERIAL PRIMARY KEY,
	created_at TIMESTAMP DEFAULT NOW(),
	thread_id INTEGER REFERENCES threads(id) NOT NULL,
	role TEXT NOT NULL,
	content TEXT NOT NULL,
	assistant_id INTEGER REFERENCES assistants(id),
	run_id INTEGER REFERENCES runs(id),
	file_ids TEXT, -- treat as JSON
	metadata TEXT -- treat as JSON
);
