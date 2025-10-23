declare class DataPantryDatabase {
    private apiKey;
    private baseUrl;
    constructor(apiKey: string, baseUrl?: string);
    sql(query: string, ...params: any[]): Promise<any>;
    schema(): Promise<any>;
    private mapSQLiteType;
    private findForeignKey;
    select(...columns: string[]): SelectQueryBuilder;
    insert(table: string): InsertQueryBuilder;
    update(table: string): UpdateQueryBuilder;
    delete(): DeleteQueryBuilder;
}
declare class QueryBuilder {
    protected db: DataPantryDatabase;
    protected query: string;
    protected params: any[];
    constructor(db: DataPantryDatabase);
    protected execute(): Promise<any>;
    then(resolve?: any, reject?: any): Promise<any>;
    catch(reject: any): Promise<any>;
    finally(callback: any): Promise<any>;
}
declare class SelectQueryBuilder extends QueryBuilder {
    constructor(db: DataPantryDatabase, columns: string[]);
    from(table: string): this;
    where(condition: WhereCondition): this;
    orWhere(condition: WhereCondition): this;
    orderBy(column: string, direction?: 'ASC' | 'DESC'): this;
    limit(n: number): this;
    offset(n: number): this;
    join(table: string, condition: string): this;
    leftJoin(table: string, condition: string): this;
    first(): Promise<any>;
    count(): Promise<any>;
}
declare class InsertQueryBuilder extends QueryBuilder {
    private table;
    constructor(db: DataPantryDatabase, table: string);
    values(data: any | any[]): this;
}
declare class UpdateQueryBuilder extends QueryBuilder {
    private table;
    constructor(db: DataPantryDatabase, table: string);
    set(data: any): this;
    where(condition: WhereCondition): this;
    orWhere(condition: WhereCondition): this;
}
declare class DeleteQueryBuilder extends QueryBuilder {
    constructor(db: DataPantryDatabase);
    from(table: string): this;
    where(condition: WhereCondition): this;
    orWhere(condition: WhereCondition): this;
}
interface WhereCondition {
    sql: string;
    params: any[];
}
declare function eq(column: string, value: any): WhereCondition;
declare function ne(column: string, value: any): WhereCondition;
declare function gt(column: string, value: any): WhereCondition;
declare function gte(column: string, value: any): WhereCondition;
declare function lt(column: string, value: any): WhereCondition;
declare function lte(column: string, value: any): WhereCondition;
declare function like(column: string, pattern: string): WhereCondition;
declare function inArray(column: string, values: any[]): WhereCondition;
declare const DataPantry: {
    database(apiKey: string, baseUrl?: string): DataPantryDatabase;
};
export default DataPantry;
export { eq, ne, gt, gte, lt, lte, like, inArray };
