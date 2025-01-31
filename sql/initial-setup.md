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
    "password": "<PASSWORD>"
    "database": "lynx",
}

Replace <PASSWORD> with the password from step 2.
```
