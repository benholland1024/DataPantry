/**
 * Test script for DataPantry SDK
 * 
 * Full list of methods to test:
 * - Making a database instance:
 *   - DataPantry.database(apiKey, baseUrl)
 * - Retrieving schema:
 *   - .schema()                              Test 1
 * - Running raw SQL queries:                 -
 *   - .sql(queryString, ...params)           Test 2, 3, 4
 * Chainable query builder methods:           -
 * - SELECT queries:                          -
 *   - .select(columns),                      Test 5
 *   - .from(tableName),                      Test 5                   
 *   - .where(condition),                     Test 5
 *   - .orWhere(condition),                   Test 6
 *   - .orderBy(column, direction),           Test 7
 *   - .limit(count),                         Test 7
 *   - .offset(count),                        Test 7
 *   - .join(tableName, condition),           Test 10
 *   - .leftJoin(tableName, condition),       Test 
 *  - INSERT queries:
 *   - .insert(tableName).values(data),       Test 9
 *  - UPDATE queries:
 *   - .update(tableName).set(data)           Test 10
 *   - .where(condition),                     Test 10
 *  - DELETE queries:
 *   - .delete().from(tableName),             Test 11
 *   - .where(condition)                      Test 11
 * Condition builders:
 *   - eq(column, value),                     Test 5
 *   - ne(column, value),
 *   - gt(column, value),
 *   - gte(column, value),
 *   - lt(column, value),
 *   - lte(column, value),
 *   - like(column, pattern),
 *   - inArray(column, valuesArray)
 * 
 * Each method should be tested for correct functionality and error handling.
 */


import DataPantry from '../dist/index.js'
import { eq, ne, gt, gte, lt, lte, like, inArray } from '../dist/index.js'
import process from 'process'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

console.log("  =  =  =  Running test script  =  =  =  ");
// console.log("Using API Key:", process.env.API_KEY);

const myDatabase = DataPantry.database(process.env.API_KEY, 'https://staging.datapantry.org');

const expectedSchema = {
  "tables": [
    {
      "name": "Pixels",
      "columns": [
        {
          "name": "id",
          "datatype": "number",
          "constraint": "primary",
          "isRequired": true,
          "foreignKey": null
        },
        {
          "name": "x",
          "datatype": "number",
          "constraint": "none",
          "isRequired": false,
          "foreignKey": null
        },
        {
          "name": "y",
          "datatype": "number",
          "constraint": "none",
          "isRequired": false,
          "foreignKey": null
        },
        {
          "name": "color",
          "datatype": "string",
          "constraint": "none",
          "isRequired": false,
          "foreignKey": null
        }
      ]
    },
    {
      "name": "Colors",
      "columns": [
        {
          "name": "id",
          "datatype": "number",
          "constraint": "primary",
          "isRequired": true,
          "foreignKey": null
        },
        {
          "name": "name",
          "datatype": "string",
          "constraint": "none",
          "isRequired": false,
          "foreignKey": null
        }
      ]
    }
  ]
}

async function test() {

  //  TEST 1: Get schema
  const schema = await myDatabase.schema()  //  { DBname: String, tables: [] }
  if (typeof schema != 'object') {
    throw new Error("Schema is not an object")
  } else if (JSON.stringify(schema) !== JSON.stringify(expectedSchema)) {
    let diffs = findDifferences(expectedSchema, schema)
    console.log("The schema was:", JSON.stringify(schema, null, 2))
    console.error("Schema differences found:")
    diffs.forEach(diff => console.error(" - ", diff))
    throw new Error("Schema does not match expected schema")
  } else {
    console.log("1. ✅ Schema matches expected schema")
  }

  //  TEST 2: Run SQL query with no parameters
  const pixels = await myDatabase.sql(
    'SELECT * FROM Pixels'
  )
  if (!Array.isArray(pixels)) {
    throw new Error("Pixels is not an array")
  } else {
    console.log(`2. ✅ Retrieved ${pixels.length} pixel${pixels.length === 1 ? '' : 's'} total`)
  }

  //  TEST 3: Run SQL query with parameters
  const pixels2 = await myDatabase.sql(
    'SELECT * FROM Pixels WHERE x = ? AND y = ?', 3, 4
  )
  if (!Array.isArray(pixels2)) {
    throw new Error("Pixels2 is not an array")
  } else {
    console.log(`3. ✅ Retrieved ${pixels2.length} pixel${pixels2.length === 1 ? '' : 's'} at (3,4)`)
  }

  //  TEST 4: Error handling - invalid SQL
  let errorCaught = false
  try {
    await myDatabase.sql(
      'SELECTE * FROM Pixels'  //  'SELECTE' is invalid SQL
    )
  } catch (error) {
    errorCaught = true
    console.log("4. ✅ Caught error for invalid SQL query")
  }
  if (!errorCaught) {
    throw new Error("Did not catch error for invalid SQL query")
  }

  //  TEST 5: Run SQL query using chainable query builder
  //   Tests: select, from, where, eq
  const pixels3 = await myDatabase.select('*')
    .from('Pixels')
    .where(eq('x', 3))
    .where(eq('y', 4))
  if (!Array.isArray(pixels3)) {
    throw new Error("Pixels3 is not an array")
  } else {
    console.log(`5. ✅ Retrieved ${pixels3.length} pixel${pixels3.length === 1 ? '' : 's'} at (3,4)`)
  }

  //  TEST 6: OR condition
  const pixels4 = await myDatabase.select('*')
    .from('Pixels')
    .where(eq('x', 3))
    .orWhere(eq('y', 4))
  if (!Array.isArray(pixels4)) {
    throw new Error("Pixels4 is not an array")
  } else {
    console.log(`6. ✅ Retrieved ${pixels4.length} pixel${pixels4.length === 1 ? '' : 's'} at (3,4) OR (x=3)`)
  }

  //  TEST 7: ORDER BY, LIMIT, OFFSET
  const pixels5 = await myDatabase.select('*')
    .from('Pixels')
    .orderBy('id', 'DESC')
    .limit(5)
    .offset(2)
  if (!Array.isArray(pixels5)) {
    throw new Error("Pixels5 is not an array")
  } else {
    console.log(`7. ✅ Retrieved ${pixels5.length} pixel${pixels5.length === 1 ? '' : 's'} with ORDER BY, LIMIT, OFFSET`)
  }

  //  TEST 8: JOIN
  console.log(eq('Pixels.color', 'Colors.name'))
  const pixels6 = await myDatabase.select('Pixels.*', 'Colors.id AS color_id')
    .from('Pixels')
    .join('Colors', 'Pixels.color = Colors.name')
  if (!Array.isArray(pixels6)) {
    throw new Error("Pixels6 is not an array")
  } else {
    console.log(`8. ✅ Retrieved ${pixels6.length} pixel${pixels6.length === 1 ? '' : 's'} with JOIN`)
  }

  //  TEST 9: LEFT JOIN
  const pixels7 = await myDatabase.select('Pixels.*', 'Colors.id AS color_id')
    .from('Pixels')
    .leftJoin('Colors', 'Pixels.color = Colors.name')
  if (!Array.isArray(pixels7)) {
    throw new Error("Pixels7 is not an array")
  } else {
    console.log(`9. ✅ Retrieved ${pixels7.length} pixel${pixels7.length === 1 ? '' : 's'} with LEFT JOIN`)
  }

  //  TEST 10: Insert a new pixel
  const id = pixels.length + Math.floor(Math.random() * 1000)  //  Generate a new unique ID
  const insertResult = await myDatabase.insert('Pixels').values({
    id: id,
    x: 10,
    y: 20,
    color: 'red'
  })
  console.log("Insert result:", insertResult)
  if (insertResult.changes !== 1) {
    throw new Error("Insert did not affect 1 row")
  } else {
    console.log("10. ✅ Inserted new pixel at (10,20) with color 'red'")
  }

  //  TEST 11: Update a pixel
  const updateResult = await myDatabase.update('Pixels')
    .set({ color: 'blue' })
    .where(eq('x', 10))
    .where(eq('y', 20))
  console.log("Update result:", updateResult)
  if (updateResult.changes < 1) {
    throw new Error("Update did not affect any row")
  } else {
    console.log(`11. ✅ Updated ${updateResult.changes} pixel${updateResult.changes === 1 ? '' : 's'} at (10,20) to color 'blue'`)
  }

  //  TEST 12: Delete a pixel
  const deleteResult = await myDatabase.delete()
    .from('Pixels')
    .where(eq('x', 10))
    .where(eq('y', 20))
  if (deleteResult.changes < 1) {
    throw new Error("Delete did not affect any row")
  } else {
    console.log(`12. ✅ Deleted ${deleteResult.changes} pixel${deleteResult.changes === 1 ? '' : 's'} at (10,20)`)
  }

  console.log("  =  =  =  All tests completed successfully  =  =  =  ");
}
test()


//  =  =  =  =  =  =
//  Helper functions
//  =  =  =  =  =  =

//  Function to find differences between two objects
function findDifferences(obj1, obj2) {
  const diffs = []

  for (const key in obj1) {
    if (!(key in obj2)) {
      diffs.push(`Key '${key}' missing in second object`)
    } else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
      const childDiffs = findDifferences(obj1[key], obj2[key])
      diffs.push(...childDiffs.map(diff => `${key}.${diff}`))
    } else if (obj1[key] !== obj2[key]) {
      diffs.push(`Value mismatch for key '${key}': ${obj1[key]} !== ${obj2[key]}`)
    }
  }

  for (const key in obj2) {
    if (!(key in obj1)) {
      diffs.push(`Key '${key}' missing in first object`)
    }
  }

  return diffs
}