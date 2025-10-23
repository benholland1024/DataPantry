// datapantry/index.ts

class DataPantryDatabase {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl = 'https://datapantry.org') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async sql(query: string, ...params: any[]) {
    const response = await fetch(`${this.baseUrl}/api/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'APIkey': this.apiKey
      },
      body: JSON.stringify({ query, parameters: params })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.statusMessage || 'Query failed')
    }

    const data = await response.json()
    return data.result
  }

  async schema() {
    const tables = await this.sql(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `)

    const schema: any = { tables: [] }

    for (const { name } of tables) {
      const columns = await this.sql(`PRAGMA table_info("${name}")`)
      const foreignKeys = await this.sql(`PRAGMA foreign_key_list("${name}")`)

      const tableSchema = {
        name,
        columns: columns.map((col: any) => ({
          name: col.name,
          datatype: this.mapSQLiteType(col.type),
          constraint: col.pk ? 'primary' : (col.notnull ? 'unique' : 'none'),
          isRequired: col.notnull === 1,
          foreignKey: this.findForeignKey(col.name, foreignKeys)
        }))
      }

      schema.tables.push(tableSchema)
    }

    return schema
  }

  private mapSQLiteType(sqliteType: string): string {
    const upper = sqliteType.toUpperCase()
    if (upper.includes('INT')) return 'number'
    if (upper === 'REAL') return 'number'
    if (upper === 'TEXT') return 'string'
    return 'string'
  }

  private findForeignKey(columnName: string, foreignKeys: any[]) {
    const fk = foreignKeys.find((fk: any) => fk.from === columnName)
    if (!fk) return null
    
    return {
      tableName: fk.table,
      columnName: fk.to
    }
  }

  // Query builder entry points
  select(...columns: string[]) {
    return new SelectQueryBuilder(this, columns)
  }

  insert(table: string) {
    return new InsertQueryBuilder(this, table)
  }

  update(table: string) {
    return new UpdateQueryBuilder(this, table)
  }

  delete() {
    return new DeleteQueryBuilder(this)
  }
}

// Base QueryBuilder class
class QueryBuilder {
  protected db: DataPantryDatabase
  protected query: string = ''
  protected params: any[] = []

  constructor(db: DataPantryDatabase) {
    this.db = db
  }

  protected async execute() {
    return await this.db.sql(this.query, ...this.params)
  }

  // Make it thenable (Promise-like)
  then(resolve?: any, reject?: any) {
    return this.execute().then(resolve, reject)
  }

  catch(reject: any) {
    return this.execute().catch(reject)
  }

  finally(callback: any) {
    return this.execute().finally(callback)
  }
}

// SELECT query builder
class SelectQueryBuilder extends QueryBuilder {
  constructor(db: DataPantryDatabase, columns: string[]) {
    super(db)
    const cols = columns.length === 0 ? '*' : columns.join(', ')
    this.query = `SELECT ${cols}`
  }

  from(table: string) {
    this.query += ` FROM "${table}"`
    return this
  }

  where(condition: WhereCondition) {
    if (this.query.includes('WHERE')) {
      this.query += ` AND ${condition.sql}`
    } else {
      this.query += ` WHERE ${condition.sql}`
    }
    this.params.push(...condition.params)
    return this
  }

  orWhere(condition: WhereCondition) {
    if (this.query.includes('WHERE')) {
      this.query += ` OR ${condition.sql}`
    } else {
      this.query += ` WHERE ${condition.sql}`
    }
    this.params.push(...condition.params)
    return this
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC') {
    this.query += ` ORDER BY "${column}" ${direction}`
    return this
  }

  limit(n: number) {
    this.query += ` LIMIT ${n}`
    return this
  }

  offset(n: number) {
    this.query += ` OFFSET ${n}`
    return this
  }

  join(table: string, condition: string) {
    this.query += ` INNER JOIN "${table}" ON ${condition}`
    return this
  }

  leftJoin(table: string, condition: string) {
    this.query += ` LEFT JOIN "${table}" ON ${condition}`
    return this
  }

  async first() {
    const results = await this.execute()
    return results[0] || null
  }

  async count() {
    // Replace SELECT clause with COUNT(*)
    const countQuery = this.query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM')
    const result = await this.db.sql(countQuery, ...this.params)
    return result[0].count
  }
}

// INSERT query builder
class InsertQueryBuilder extends QueryBuilder {
  private table: string

  constructor(db: DataPantryDatabase, table: string) {
    super(db)
    this.table = table
  }

  values(data: any | any[]) {
    const rows = Array.isArray(data) ? data : [data]
    const columns = Object.keys(rows[0])
    const columnNames = columns.map(col => `"${col}"`).join(', ')
    
    const valuePlaceholders = rows.map(() => 
      `(${columns.map(() => '?').join(', ')})`
    ).join(', ')

    this.query = `INSERT INTO "${this.table}" (${columnNames}) VALUES ${valuePlaceholders}`
    
    // Flatten all values into params array
    rows.forEach(row => {
      columns.forEach(col => {
        this.params.push(row[col])
      })
    })

    return this
  }
}

// UPDATE query builder
class UpdateQueryBuilder extends QueryBuilder {
  private table: string

  constructor(db: DataPantryDatabase, table: string) {
    super(db)
    this.table = table
    this.query = `UPDATE "${table}"`
  }

  set(data: any) {
    const columns = Object.keys(data)
    const setClause = columns.map(col => `"${col}" = ?`).join(', ')
    this.query += ` SET ${setClause}`
    this.params.push(...columns.map(col => data[col]))
    return this
  }

  where(condition: WhereCondition) {
    if (this.query.includes('WHERE')) {
      this.query += ` AND ${condition.sql}`
    } else {
      this.query += ` WHERE ${condition.sql}`
    }
    this.params.push(...condition.params)
    return this
  }

  orWhere(condition: WhereCondition) {
    if (this.query.includes('WHERE')) {
      this.query += ` OR ${condition.sql}`
    } else {
      this.query += ` WHERE ${condition.sql}`
    }
    this.params.push(...condition.params)
    return this
  }
}

// DELETE query builder
class DeleteQueryBuilder extends QueryBuilder {
  constructor(db: DataPantryDatabase) {
    super(db)
    this.query = 'DELETE'
  }

  from(table: string) {
    this.query += ` FROM "${table}"`
    return this
  }

  where(condition: WhereCondition) {
    if (this.query.includes('WHERE')) {
      this.query += ` AND ${condition.sql}`
    } else {
      this.query += ` WHERE ${condition.sql}`
    }
    this.params.push(...condition.params)
    return this
  }

  orWhere(condition: WhereCondition) {
    if (this.query.includes('WHERE')) {
      this.query += ` OR ${condition.sql}`
    } else {
      this.query += ` WHERE ${condition.sql}`
    }
    this.params.push(...condition.params)
    return this
  }
}

// WHERE condition helpers
interface WhereCondition {
  sql: string
  params: any[]
}

function eq(column: string, value: any): WhereCondition {
  return { sql: `"${column}" = ?`, params: [value] }
}

function ne(column: string, value: any): WhereCondition {
  return { sql: `"${column}" != ?`, params: [value] }
}

function gt(column: string, value: any): WhereCondition {
  return { sql: `"${column}" > ?`, params: [value] }
}

function gte(column: string, value: any): WhereCondition {
  return { sql: `"${column}" >= ?`, params: [value] }
}

function lt(column: string, value: any): WhereCondition {
  return { sql: `"${column}" < ?`, params: [value] }
}

function lte(column: string, value: any): WhereCondition {
  return { sql: `"${column}" <= ?`, params: [value] }
}

function like(column: string, pattern: string): WhereCondition {
  return { sql: `"${column}" LIKE ?`, params: [pattern] }
}

function inArray(column: string, values: any[]): WhereCondition {
  const placeholders = values.map(() => '?').join(', ')
  return { sql: `"${column}" IN (${placeholders})`, params: values }
}

// Main export
const DataPantry = {
  database(apiKey: string, baseUrl?: string) {
    return new DataPantryDatabase(apiKey, baseUrl)
  }
}

export default DataPantry
export { eq, ne, gt, gte, lt, lte, like, inArray }
