# Setting up MySQL server

### 1. Install MariaDB server

### 2. Create database

Enter the MariaDB shell: `sudo mysql`

Create new database called `lynx`.

```sql
CREATE DATABASE lynx;
```

Create a new user to use by the backend, Feline.

```sql
CREATE USER 'feline_user'@'localhost' IDENTIFIED BY '<PASSWORD>';
```

Replace <PASSWORD> with a strong password.

### 3. Store credentials in credentials.json

`credentials.json`
```json
{
    "host": "localhost",
    "user": "feline_user",
    "password": "<PASSWORD>",
    "database": "lynx"
}

Replace <PASSWORD> with the password from step 2.
```

### 3. Grant privileges

Grant privileges for the back-end to execute SQL command.

```sql
GRANT SELECT, INSERT ON lynx.* TO 'feline_user'@'localhost';
```

### 4. Create tables

First, open the database in MariaDB:
```sql
USE lynx;
```

Then run the scripts in the sql/ directory.
```sql
source sql/create_user_table.sql;
```


