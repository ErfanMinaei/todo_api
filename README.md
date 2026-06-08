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

## REST API

| Method | Endpoint               | Description                                                                 | Authentication |
|--------|------------------------|-----------------------------------------------------------------------------|----------------|
| PUT    | `/file/upload?todoId=…`| Upload a file and attach it to a specific todo (multipart/form-data, field `file`). | Required |
| GET    | `/file/url/:id`        | Get a presigned URL to download the file.                                  | Required |
| DELETE | `/file/:id`            | Delete a file (also removes it from MinIO and database).                   | Required |
| GET    | `/`                    | Health check – returns "Hello World".                                      | None |

### Examples

**Upload a file**

```bash
curl -X PUT "http://localhost:3000/file/upload?todoId=1" \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@/path/to/document.pdf"
```

**Response**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "document.pdf",
  "message": "File uploaded successfully"
}
```

**Get file URL**

```bash
curl -X GET "http://localhost:3000/file/url/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <accessToken>"
```

**Response**
```json
{
  "url": "https://minio.example.com/bucket/...?X-Amz-Expires=3600..."
}
```

**Delete file**

```bash
curl -X DELETE "http://localhost:3000/file/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <accessToken>"
```

**Response**
```json
{
  "message": "File deleted successfully"
}
```

## GraphQL API

All GraphQL operations are available at `http://localhost:3000/graphql`.  
Use the `Authorization: Bearer <accessToken>` header for protected operations.

### Queries

#### `todos`
Get all todos for a specific todo list (owned by the authenticated user).

```graphql
query GetTodos($todoListId: Int!) {
  todos(todoListId: $todoListId) {
    id
    title
    description
    isDone
    deadline
    attachments {
      id
      originalName
      mimeType
      size
    }
  }
}
```
**Variables**
```json
{ "todoListId": 1 }
```
**Response**
```json
{
  "data": {
    "todos": [
      {
        "id": 1,
        "title": "Buy groceries",
        "description": "Milk, eggs, bread",
        "isDone": false,
        "deadline": "2026-12-31T23:59:59.000Z",
        "attachments": []
      }
    ]
  }
}
```

#### `todo`
Get a single todo by ID.

```graphql
query GetTodo($id: Int!) {
  todo(id: $id) {
    id
    title
    description
    isDone
    deadline
    todoList { title }
  }
}
```
**Variables**
```json
{ "id": 1 }
```

#### `adminTodos` (Roles: ADMIN, SUPERADMIN)
List todos of a todo list, even if it belongs to another user (subject to role restrictions).

```graphql
query AdminTodos($todoListId: Int!) {
  adminTodos(todoListId: $todoListId) {
    id
    title
    todoList { title user { username } }
  }
}
```
**Variables**
```json
{ "todoListId": 2 }
```

#### `todoLists`
Get all todo lists belonging to the authenticated user.

```graphql
query GetMyTodoLists {
  todoLists {
    id
    title
    createdAt
    todos { id title isDone }
  }
}
```
**Variables** – none.

#### `userTodoLists` (Roles: ADMIN, SUPERADMIN)
Get todo lists of a specific user.

```graphql
query GetUserTodoLists($userId: Int!) {
  userTodoLists(userId: $userId) {
    id
    title
    user { username }
    todos { id }
  }
}
```
**Variables**
```json
{ "userId": 2 }
```

#### `allUsers` (Roles: ADMIN, SUPERADMIN)
List all users (password included for ADMIN/SUPERADMIN).

```graphql
query GetAllUsers {
  allUsers {
    id
    username
    firstName
    lastName
    roles
  }
}
```
**Variables** – none.

### Mutations

#### `login`
Authenticate and receive tokens.

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
    user {
      id
      username
      roles
    }
  }
}
```
**Variables**
```json
{ "input": { "username": "superadmin", "password": "password123" } }
```
**Response**
```json
{
  "data": {
    "login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "user": { "id": 1, "username": "superadmin", "roles": ["SUPERADMIN","ADMIN","USER"] }
    }
  }
}
```

#### `register`
Create a new regular user.

```graphql
mutation Register($input: RegisterUserInput!) {
  register(input: $input) {
    accessToken
    refreshToken
    user { id username roles }
  }
}
```
**Variables**
```json
{ "input": { "firstName": "John", "lastName": "Doe", "username": "johndoe", "password": "secret" } }
```

#### `refresh`
Get new access/refresh tokens using a valid refresh token.

```graphql
mutation Refresh($refreshToken: String!) {
  refresh(refreshToken: $refreshToken) {
    accessToken
    refreshToken
  }
}
```
**Variables**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
```

#### `logout`
Invalidate a refresh token (log out one device).

```graphql
mutation Logout($refreshToken: String!) {
  logout(refreshToken: $refreshToken)
}
```
**Variables**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
```

#### `createTodo`
Create a new todo inside a todo list owned by the current user.

```graphql
mutation CreateTodo($input: CreateTodoInput!) {
  createTodo(input: $input) {
    id
    title
    deadline
  }
}
```
**Variables**
```json
{ "input": { "title": "Finish report", "description": "Write Q3 summary", "deadline": "2026-07-01T12:00:00Z", "todoListId": 1 } }
```

#### `updateTodo`
Update an existing todo (only fields provided are updated).

```graphql
mutation UpdateTodo($id: Int!, $input: UpdateTodoInput!) {
  updateTodo(id: $id, input: $input) {
    id
    title
    isDone
  }
}
```
**Variables**
```json
{ "id": 1, "input": { "isDone": true } }
```

#### `deleteTodo`
Delete a todo.

```graphql
mutation DeleteTodo($id: Int!) {
  deleteTodo(id: $id)
}
```
**Variables**
```json
{ "id": 1 }
```

#### `adminCreateTodo`, `adminUpdateTodo`, `adminDeleteTodo` (Roles: ADMIN/SUPERADMIN)
Same as above but can act on todos of other users (subject to role restrictions – ADMINS cannot modify SUPERADMIN or other ADMIN’s todos).

```graphql
mutation AdminCreateTodo($input: CreateTodoInput!) {
  adminCreateTodo(input: $input) { id title }
}
```

#### `createTodoList`
Create a new todo list for the authenticated user.

```graphql
mutation CreateTodoList($input: CreateTodoListInput!) {
  createTodoList(input: $input) {
    id
    title
  }
}
```
**Variables**
```json
{ "input": { "title": "Work tasks" } }
```

#### `updateTodoList`
Rename a todo list.

```graphql
mutation UpdateTodoList($id: Int!, $input: UpdateTodoListInput!) {
  updateTodoList(id: $id, input: $input) {
    id
    title
  }
}
```
**Variables**
```json
{ "id": 1, "input": { "title": "Home chores" } }
```

#### `deleteTodoList`
Delete a todo list (cascades to its todos and file attachments).

```graphql
mutation DeleteTodoList($id: Int!) {
  deleteTodoList(id: $id)
}
```
**Variables**
```json
{ "id": 1 }
```

#### `adminCreateTodoList`, `adminUpdateTodoList`, `adminDeleteTodoList` (Roles: ADMIN/SUPERADMIN)
Admin versions – can manage any user’s todo lists (with same role restrictions).

```graphql
mutation AdminCreateTodoList($userId: Int!, $input: CreateTodoListInput!) {
  adminCreateTodoList(userId: $userId, input: $input) { id title }
}
```
**Variables**
```json
{ "userId": 2, "input": { "title": "Project alpha" } }
```

#### `updateSelf`
Update the authenticated user’s profile. To change password, provide `currentPassword` and `newPassword`.

```graphql
mutation UpdateSelf($input: UpdateUserInput!) {
  updateSelf(input: $input) {
    id
    username
    firstName
    lastName
  }
}
```
**Variables**
```json
{ "input": { "firstName": "Jonathan", "currentPassword": "oldPass", "newPassword": "newPass123" } }
```

#### `deleteSelf`
Delete the authenticated user’s own account.

```graphql
mutation DeleteSelf {
  deleteSelf
}
```
**Variables** – none.

#### `createAdmin` (Role: SUPERADMIN)
Create a new admin user.

```graphql
mutation CreateAdmin($input: RegisterUserInput!) {
  createAdmin(input: $input) {
    id
    username
    roles
  }
}
```
**Variables**
```json
{ "input": { "firstName": "Alice", "username": "alice_admin", "password": "secure" } }
```

#### `promoteToAdmin` (Role: SUPERADMIN)
Grant ADMIN role to an existing user.

```graphql
mutation PromoteToAdmin($userId: Int!) {
  promoteToAdmin(userId: $userId) {
    id
    username
    roles
  }
}
```
**Variables**
```json
{ "userId": 3 }
```

#### `demoteFromAdmin` (Role: SUPERADMIN)
Remove ADMIN role from a user.

```graphql
mutation DemoteFromAdmin($userId: Int!) {
  demoteFromAdmin(userId: $userId) {
    id
    roles
  }
}
```
**Variables**
```json
{ "userId": 3 }
```

#### `updateUser` (Roles: ADMIN, SUPERADMIN)
Update another user’s profile. SUPERADMIN can update anyone; ADMIN can only update regular users.

```graphql
mutation UpdateUser($userId: Int!, $input: UpdateUserByAdminInput!) {
  updateUser(userId: $userId, input: $input) {
    id
    username
    firstName
  }
}
```
**Variables**
```json
{ "userId": 2, "input": { "firstName": "Jane", "newPassword": "newsecret" } }
```

#### `deleteUser` (Roles: ADMIN, SUPERADMIN)
Delete another user. Cannot delete SUPERADMIN.

```graphql
mutation DeleteUser($userId: Int!) {
  deleteUser(userId: $userId)
}
```
**Variables**
```json
{ "userId": 4 }
```

#### `unattachFile`
Detach a file from a todo and delete the file from storage (same as REST DELETE).

```graphql
mutation UnattachFile($id: String!) {
  unattachFile(id: $id)
}
```
**Variables**
```json
{ "id": "550e8400-e29b-41d4-a716-446655440000" }
```

## Postman collection

Below is a complete Postman collection v2.1 that includes all REST endpoints and GraphQL operations.  
To use it:

1. Save the JSON as `todo_api.postman_collection.json`.
2. Import into Postman.
3. The collection includes a variable `baseUrl` (default `http://localhost:3000`).
4. Use the **Login** request to obtain tokens; the collection has an **auth** folder with requests that automatically set the bearer token (you can enable token inheritance at collection level).

```json
{
  "info": {
    "name": "Todo API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "accessToken",
      "value": "",
      "type": "string"
    },
    {
      "key": "refreshToken",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "REST",
      "item": [
        {
          "name": "Upload file",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "file",
                  "type": "file",
                  "src": "/path/to/sample.pdf"
                }
              ]
            },
            "url": {
              "raw": "{{baseUrl}}/file/upload?todoId=1",
              "host": ["{{baseUrl}}"],
              "path": ["file", "upload"],
              "query": [
                {
                  "key": "todoId",
                  "value": "1"
                }
              ]
            }
          }
        },
        {
          "name": "Get file URL",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/file/url/{{fileId}}",
              "host": ["{{baseUrl}}"],
              "path": ["file", "url", "{{fileId}}"]
            }
          }
        },
        {
          "name": "Delete file",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/file/{{fileId}}",
              "host": ["{{baseUrl}}"],
              "path": ["file", "{{fileId}}"]
            }
          }
        }
      ]
    },
    {
      "name": "GraphQL",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation Login($input: LoginInput!) { login(input: $input) { accessToken refreshToken user { id username roles } } }\",\n  \"variables\": {\n    \"input\": {\n      \"username\": \"superadmin\",\n      \"password\": \"password123\"\n    }\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          },
          "response": []
        },
        {
          "name": "Refresh token",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation Refresh($refreshToken: String!) { refresh(refreshToken: $refreshToken) { accessToken refreshToken } }\",\n  \"variables\": {\n    \"refreshToken\": \"{{refreshToken}}\"\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Logout",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation Logout($refreshToken: String!) { logout(refreshToken: $refreshToken) }\",\n  \"variables\": {\n    \"refreshToken\": \"{{refreshToken}}\"\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Get my todo lists",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"query { todoLists { id title createdAt todos { id title isDone } } }\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Create todo list",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation CreateTodoList($input: CreateTodoListInput!) { createTodoList(input: $input) { id title } }\",\n  \"variables\": {\n    \"input\": { \"title\": \"My new list\" }\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Create todo",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation CreateTodo($input: CreateTodoInput!) { createTodo(input: $input) { id title deadline } }\",\n  \"variables\": {\n    \"input\": {\n      \"title\": \"Write documentation\",\n      \"description\": \"Explain the API\",\n      \"deadline\": \"2026-08-01T10:00:00Z\",\n      \"todoListId\": 1\n    }\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Update todo",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation UpdateTodo($id: Int!, $input: UpdateTodoInput!) { updateTodo(id: $id, input: $input) { id isDone } }\",\n  \"variables\": {\n    \"id\": 1,\n    \"input\": { \"isDone\": true }\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Delete todo",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation DeleteTodo($id: Int!) { deleteTodo(id: $id) }\",\n  \"variables\": {\n    \"id\": 1\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Unattach file",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation UnattachFile($id: String!) { unattachFile(id: $id) }\",\n  \"variables\": {\n    \"id\": \"{{fileId}}\"\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Admin - Get all users",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"query { allUsers { id username roles } }\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/graphql",
              "host": ["{{baseUrl}}"],
              "path": ["graphql"]
            }
          }
        }
      ]
    }
  ]
}
```