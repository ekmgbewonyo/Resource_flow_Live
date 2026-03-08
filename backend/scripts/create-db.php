<?php
/**
 * Create PostgreSQL database if it doesn't exist.
 * Run: php scripts/create-db.php
 * Then: php artisan migrate
 */
$dbName = getenv('DB_DATABASE') ?: 'resourceflow';
$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '5432';
$user = getenv('DB_USERNAME') ?: 'postgres';
$pass = getenv('DB_PASSWORD') ?: '';

// Load .env if available
$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (preg_match('/^([^=]+)=(.*)$/', $line, $m)) {
            $k = trim($m[1]);
            $v = trim($m[2], " \t\n\r\0\x0B\"'");
            if (in_array($k, ['DB_DATABASE', 'DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD'])) {
                putenv("$k=$v");
                $_ENV[$k] = $v;
            }
        }
    }
    $dbName = getenv('DB_DATABASE') ?: $dbName;
    $host = getenv('DB_HOST') ?: $host;
    $port = getenv('DB_PORT') ?: $port;
    $user = getenv('DB_USERNAME') ?: $user;
    $pass = getenv('DB_PASSWORD') ?: $pass;
}

try {
    $pdo = new PDO(
        "pgsql:host=$host;port=$port;dbname=postgres",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $pdo->exec("CREATE DATABASE $dbName");
    echo "Database '$dbName' created successfully.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "Database '$dbName' already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}
