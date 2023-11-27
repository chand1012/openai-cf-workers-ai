
DROP TABLE IF EXISTS threads;
CREATE TABLE threads (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	metadata TEXT
);

DROP TABLE IF EXISTS assistants;
CREATE TABLE assistants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		description TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		model TEXT,
		instructions TEXT,
		tools TEXT,
		file_ids TEXT,
		metadata TEXT
);

DROP TABLE IF EXISTS runs;
CREATE TABLE runs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	assistant_id INTEGER REFERENCES assistants(id) NOT NULL,
	thread_id INTEGER REFERENCES threads(id) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	status TEXT NOT NULL,
	required_action TEXT,
	last_error TEXT,
	expires_at TIMESTAMP NOT NULL,
	started_at TIMESTAMP,
	cancelled_at TIMESTAMP,
	failed_at TIMESTAMP,
	completed_at TIMESTAMP,
	model TEXT NOT NULL,
	instructions TEXT NOT NULL,
	tools TEXT,
	file_ids TEXT,
	metadata TEXT
);

DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	thread_id INTEGER REFERENCES threads(id) NOT NULL,
	role TEXT NOT NULL,
	content TEXT NOT NULL,
	assistant_id INTEGER REFERENCES assistants(id),
	run_id INTEGER REFERENCES runs(id),
	file_ids TEXT,
	metadata TEXT
);
