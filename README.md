# README

## Project setup

The project is fully dockerized. Start all services with:

```bash
docker compose up -d
```

This will start the NestJS API, MySQL database, Redis, and MinIO (for file storage). The API will be available at `http://localhost:3000`. GraphQL playground can be accessed at `http://localhost:3000/graphql`.

## Database seeding

Insert a superadmin user and assign roles. Run these commands exactly as shown:

```bash
# Insert superadmin user
sudo docker compose exec mysql mysql -uroot -ppassword todo_db -e " INSERT INTO User (firstName, lastName, username, password) VALUES ('Super', 'Admin', 'superadmin', '$2b$10$r5efauCMg9Kj9WAzD8RHv.nnSfzhWn61XS4PxRDdJVCTt9SQxZ5Wa'); "

# Assign roles
sudo docker compose exec mysql mysql -uroot -ppassword todo_db -e " INSERT INTO UserRole (userId, role) SELECT id, 'SUPERADMIN' FROM User WHERE username='superadmin' UNION ALL SELECT id, 'ADMIN' FROM User WHERE username='superadmin' UNION ALL SELECT id, 'USER' FROM User WHERE username='superadmin'; "

# Verify
sudo docker compose exec mysql mysql -uroot -ppassword todo_db -e "SELECT u.username, ur.role FROM User u JOIN UserRole ur ON u.id=ur.userId;"
```

## Authentication

Most endpoints (both REST and GraphQL) require a valid JWT access token. To authenticate:

1. Call the `login` or `register` mutation to receive an `accessToken` and `refreshToken`.
2. Include the `accessToken` in the `Authorization` header as a Bearer token:
   ```
   Authorization: Bearer <accessToken>
   ```

---

## Bruno Collection

We provide a complete, ready‑to‑use collection for [Bruno](https://www.usebruno.com/) – a fast, offline‑first API client that stores collections as plain text files, perfect for version control.

The collection is available in a dedicated GitHub repository:

👉 **[TodoBruno – Bruno Collection](https://github.com/ErfanMinaei/TodoBruno)**

**How to use it:**

1. Clone the repository:
   ```bash
   git clone https://github.com/ErfanMinaei/TodoBruno.git
   ```
2. Open Bruno and import the collection folder (or simply open the folder in Bruno).
3. The collection includes all GraphQL mutations and queries, as well as REST endpoints for file operations.
4. Environment variables (`baseUrl`, `accessToken`, `refreshToken`, `fileId`, etc.) are pre‑configured – just update them to match your setup (default: `http://localhost:3000`).
5. Run the **Login** request to obtain tokens; subsequent requests will automatically use the token variables.

> **Note:** If you prefer Postman, you can export the collection from Bruno as a Postman collection (File → Export as Postman Collection) and import it into Postman. However, we recommend using Bruno directly for the best experience with this repository.
