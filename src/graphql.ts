
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export class LoginInput {
    username: string;
    password: string;
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
    isDone?: Nullable<boolean>;
    deadline?: Nullable<DateTime>;
}

export class UpdateTodoListInput {
    title?: Nullable<string>;
}

export class CreateTodoListInput {
    title: string;
}

export class RegisterUserInput {
    firstName: string;
    lastName?: Nullable<string>;
    username: string;
    password: string;
}

export class AuthPayload {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export class RefreshPayload {
    accessToken: string;
    refreshToken: string;
}

export abstract class IMutation {
    abstract login(input: LoginInput): AuthPayload | Promise<AuthPayload>;

    abstract register(input: RegisterUserInput): AuthPayload | Promise<AuthPayload>;

    abstract refresh(refreshToken: string): RefreshPayload | Promise<RefreshPayload>;

    abstract logout(): boolean | Promise<boolean>;

    abstract createTodo(input: CreateTodoInput): Todo | Promise<Todo>;

    abstract updateTodo(id: number, input: UpdateTodoInput): Todo | Promise<Todo>;

    abstract deleteTodo(id: number): boolean | Promise<boolean>;

    abstract createTodoList(input: CreateTodoListInput): TodoList | Promise<TodoList>;

    abstract updateTodoList(id: number, input: UpdateTodoListInput): TodoList | Promise<TodoList>;

    abstract deleteTodoList(id: number): boolean | Promise<boolean>;
}

export class Todo {
    id: number;
    title: string;
    description: string;
    isDone: boolean;
    deadline: DateTime;
    todoListId: number;
    todoList: TodoList;
}

export abstract class IQuery {
    abstract todos(todoListId: number): Todo[] | Promise<Todo[]>;

    abstract todo(id: number): Nullable<Todo> | Promise<Nullable<Todo>>;

    abstract todoLists(): TodoList[] | Promise<TodoList[]>;
}

export class TodoList {
    id: number;
    title: string;
    createdAt: DateTime;
    userId: number;
    user: User;
    todos: Todo[];
}

export class User {
    id: number;
    firstName: string;
    lastName?: Nullable<string>;
    username: string;
    todoLists?: Nullable<TodoList[]>;
}

export type DateTime = any;
type Nullable<T> = T | null;
