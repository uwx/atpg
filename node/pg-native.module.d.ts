declare module 'pg-native' {
    class Client {
        connectSync(connectionString: string): void;
        querySync(queryText: string, values: any[]): object[];
        prepareSync(statementName: string, queryText: string, nParams: int);
        executeSync(statementName: string, values: string[]): object[];
        connect(connectionString: string, callback: (err: Error | null) => void): void;
        query(queryText: string, values: any[], callback: (err: Error | null, rows: object[]) => void): void;
        prepare(statementName: string, queryText: string, nParams: int, callback: (err: Error | null) => void): void;
        execute(statementName: string, values: string[], callback: (err: Error | null, rows: object[]) => void): void;
        cancel(callback?: (err: Error | null) => void): void;
        end(callback?: () => void): void;
    }
    export = Client;
}