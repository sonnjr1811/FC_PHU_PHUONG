CREATE TABLE IF NOT EXISTS player_performances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    match_id INT NOT NULL,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    rating DECIMAL(3,1) DEFAULT 0.0,
    UNIQUE KEY uq_player_match (player_id, match_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
