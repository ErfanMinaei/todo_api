
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export class UpdateTodoListInput {
    title?: Nullable<string>;
}

export class CreateUserInput {
    first_name: string;
    last_name?: Nullable<string>;
    username: string;
    password: string;
}

export class LoginInput {
    username: string;
    password: string;
}

export class CreateTodoListInput {
    title: string;
}

export class CreateTodoInput {
    title: string;
    description: string;
    deadline: DateTime;
    todoListId: number;
}

export class UpdateTodoInput {
    title?: Nullable<string>;
    description?: Nullable<string>;
    is_done?: Nullable<boolean>;
    deadline?: Nullable<DateTime>;
}

export class User {
    id: number;
    first_name: string;
    last_name?: Nullable<string>;
    username: string;
    todoLists: TodoList[];
}

export class TodoList {
    id: number;
    title: string;
    created_at: DateTime;
    userId: number;
    user: User;
    todos: Todo[];
}

export class Todo {
    id: number;
    title: string;
    description: string;
    is_done: boolean;
    deadline: DateTime;
    todoListId: number;
    todoList: TodoList;
}

export class AuthPayload {
    token: string;
    user: User;
}

export abstract class IQuery {
    abstract todoLists(): TodoList[] | Promise<TodoList[]>;

    abstract todos(todoListId: number): Todo[] | Promise<Todo[]>;

    abstract todo(id: number): Nullable<Todo> | Promise<Nullable<Todo>>;
}

export abstract class IMutation {
    abstract createUser(input: CreateUserInput): User | Promise<User>;

    abstract login(input: LoginInput): AuthPayload | Promise<AuthPayload>;

    abstract createTodoList(input: CreateTodoListInput): TodoList | Promise<TodoList>;

    abstract updateTodoList(id: number, input: UpdateTodoListInput): TodoList | Promise<TodoList>;

    abstract deleteTodoList(id: number): boolean | Promise<boolean>;

    abstract createTodo(input: CreateTodoInput): Todo | Promise<Todo>;

    abstract updateTodo(id: number, input: UpdateTodoInput): Todo | Promise<Todo>;

    abstract deleteTodo(id: number): boolean | Promise<boolean>;
}

export type DateTime = any;
type Nullable<T> = T | null;
