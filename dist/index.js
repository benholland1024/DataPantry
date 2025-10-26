// datapantry/index.ts
class DataPantryDatabase {
    constructor(apiKey, baseUrl = 'https://datapantry.org') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async sql(query, ...params) {
        const response = await fetch(`${this.baseUrl}/api/v1/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'APIkey': this.apiKey
            },
            body: JSON.stringify({ query, parameters: params })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.statusMessage || 'Query failed');
        }
        const data = await response.json();
        return data.result;
    }
    async schema() {
        const tables = await this.sql(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
        const schema = { tables: [] };
        for (const { name } of tables) {
            const columns = await this.sql(`PRAGMA table_info("${name}")`);
            const foreignKeys = await this.sql(`PRAGMA foreign_key_list("${name}")`);
            const tableSchema = {
                name,
                columns: columns.map((col) => ({
                    name: col.name,
                    datatype: this.mapSQLiteType(col.type),
                    constraint: col.pk ? 'primary' : (col.notnull ? 'unique' : 'none'),
                    isRequired: col.notnull === 1,
                    foreignKey: this.findForeignKey(col.name, foreignKeys)
                }))
            };
            schema.tables.push(tableSchema);
        }
        return schema;
    }
    mapSQLiteType(sqliteType) {
        const upper = sqliteType.toUpperCase();
        if (upper.includes('INT'))
            return 'number';
        if (upper === 'REAL')
            return 'number';
        if (upper === 'TEXT')
            return 'string';
        return 'string';
    }
    findForeignKey(columnName, foreignKeys) {
        const fk = foreignKeys.find((fk) => fk.from === columnName);
        if (!fk)
            return null;
        return {
            tableName: fk.table,
            columnName: fk.to
        };
    }
    // Query builder entry points
    select(...columns) {
        return new SelectQueryBuilder(this, columns);
    }
    insert(table) {
        return new InsertQueryBuilder(this, table);
    }
    update(table) {
        return new UpdateQueryBuilder(this, table);
    }
    delete() {
        return new DeleteQueryBuilder(this);
    }
}
// Base QueryBuilder class
class QueryBuilder {
    constructor(db) {
        this.query = '';
        this.params = [];
        this.db = db;
    }
    async execute() {
        console.log("Executing query:", this.query, "with params:", this.params);
        return await this.db.sql(this.query, ...this.params);
    }
    // Make it thenable (Promise-like)
    then(resolve, reject) {
        return this.execute().then(resolve, reject);
    }
    catch(reject) {
        return this.execute().catch(reject);
    }
    finally(callback) {
        return this.execute().finally(callback);
    }
}
// SELECT query builder
class SelectQueryBuilder extends QueryBuilder {
    constructor(db, columns) {
        super(db);
        const cols = columns.length === 0 ? '*' : columns.join(', ');
        this.query = `SELECT ${cols}`;
    }
    from(table) {
        this.query += ` FROM "${table}"`;
        return this;
    }
    where(condition) {
        if (this.query.includes('WHERE')) {
            this.query += ` AND ${condition.sql}`;
        }
        else {
            this.query += ` WHERE ${condition.sql}`;
        }
        this.params.push(...condition.params);
        return this;
    }
    orWhere(condition) {
        if (this.query.includes('WHERE')) {
            this.query += ` OR ${condition.sql}`;
        }
        else {
            this.query += ` WHERE ${condition.sql}`;
        }
        this.params.push(...condition.params);
        return this;
    }
    orderBy(column, direction = 'ASC') {
        this.query += ` ORDER BY "${column}" ${direction}`;
        return this;
    }
    limit(n) {
        this.query += ` LIMIT ${n}`;
        return this;
    }
    offset(n) {
        this.query += ` OFFSET ${n}`;
        return this;
    }
    join(table, condition) {
        if (!/^[\w.\s=<>!]+$/.test(condition)) {
            throw new Error('Invalid JOIN condition');
        }
        this.query += ` INNER JOIN "${table}" ON ${condition}`;
        return this;
    }
    leftJoin(table, condition) {
        if (!/^[\w.\s=<>!]+$/.test(condition)) {
            throw new Error('Invalid LEFT JOIN condition');
        }
        this.query += ` LEFT JOIN "${table}" ON ${condition}`;
        return this;
    }
    async first() {
        const results = await this.execute();
        return results[0] || null;
    }
    async count() {
        // Replace SELECT clause with COUNT(*)
        const countQuery = this.query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM');
        const result = await this.db.sql(countQuery, ...this.params);
        return result[0].count;
    }
}
// INSERT query builder
class InsertQueryBuilder extends QueryBuilder {
    constructor(db, table) {
        super(db);
        this.table = table;
    }
    values(data) {
        const rows = Array.isArray(data) ? data : [data];
        const columns = Object.keys(rows[0]);
        const columnNames = columns.map(col => `"${col}"`).join(', ');
        const valuePlaceholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
        this.query = `INSERT INTO "${this.table}" (${columnNames}) VALUES ${valuePlaceholders}`;
        // Flatten all values into params array
        rows.forEach(row => {
            columns.forEach(col => {
                this.params.push(row[col]);
            });
        });
        return this;
    }
}
// UPDATE query builder
class UpdateQueryBuilder extends QueryBuilder {
    constructor(db, table) {
        super(db);
        this.table = table;
        this.query = `UPDATE "${table}"`;
    }
    set(data) {
        const columns = Object.keys(data);
        const setClause = columns.map(col => `"${col}" = ?`).join(', ');
        this.query += ` SET ${setClause}`;
        this.params.push(...columns.map(col => data[col]));
        return this;
    }
    where(condition) {
        if (this.query.includes('WHERE')) {
            this.query += ` AND ${condition.sql}`;
        }
        else {
            this.query += ` WHERE ${condition.sql}`;
        }
        this.params.push(...condition.params);
        return this;
    }
    orWhere(condition) {
        if (this.query.includes('WHERE')) {
            this.query += ` OR ${condition.sql}`;
        }
        else {
            this.query += ` WHERE ${condition.sql}`;
        }
        this.params.push(...condition.params);
        return this;
    }
}
// DELETE query builder
class DeleteQueryBuilder extends QueryBuilder {
    constructor(db) {
        super(db);
        this.query = 'DELETE';
    }
    from(table) {
        this.query += ` FROM "${table}"`;
        return this;
    }
    where(condition) {
        if (this.query.includes('WHERE')) {
            this.query += ` AND ${condition.sql}`;
        }
        else {
            this.query += ` WHERE ${condition.sql}`;
        }
        this.params.push(...condition.params);
        return this;
    }
    orWhere(condition) {
        if (this.query.includes('WHERE')) {
            this.query += ` OR ${condition.sql}`;
        }
        else {
            this.query += ` WHERE ${condition.sql}`;
        }
        this.params.push(...condition.params);
        return this;
    }
}
function eq(column, value) {
    return { sql: `"${column}" = ?`, params: [value] };
}
function ne(column, value) {
    return { sql: `"${column}" != ?`, params: [value] };
}
function gt(column, value) {
    return { sql: `"${column}" > ?`, params: [value] };
}
function gte(column, value) {
    return { sql: `"${column}" >= ?`, params: [value] };
}
function lt(column, value) {
    return { sql: `"${column}" < ?`, params: [value] };
}
function lte(column, value) {
    return { sql: `"${column}" <= ?`, params: [value] };
}
function like(column, pattern) {
    return { sql: `"${column}" LIKE ?`, params: [pattern] };
}
function inArray(column, values) {
    const placeholders = values.map(() => '?').join(', ');
    return { sql: `"${column}" IN (${placeholders})`, params: values };
}
// Main export
const DataPantry = {
    database(apiKey, baseUrl) {
        return new DataPantryDatabase(apiKey, baseUrl);
    }
};
export default DataPantry;
export { eq, ne, gt, gte, lt, lte, like, inArray };
