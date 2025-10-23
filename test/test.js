import DataPantry from '../dist/index.js'
import process from 'process'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

console.log("  =  =  =  Running test script  =  =  =  ");
console.log("Using API Key:", process.env.API_KEY);

const myDatabase = DataPantry.database(process.env.API_KEY, 'https://staging.datapantry.org');

const expectedSchema = {
  tables: [
    {
      name: 'Pixels',
      columns: [
        {
          name: 'id',
          datatype: 'number',
          constraint: 'primary',
          isRequired: true,
          foreignKey: null
        },
        {
          name: 'x',
          datatype: 'number',
          constraint: 'none',
          isRequired: false,
          foreignKey: null
        },
        {
          name: 'y',
          datatype: 'number',
          constraint: 'none',
          isRequired: false,
          foreignKey: null
        },
        {
          name: 'color',
          datatype: 'string',
          constraint: 'none',
          isRequired: false,
          foreignKey: null
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
    throw new Error("Schema does not match expected schema")
  } else {
    console.log("✅ Schema matches expected schema")
  }

  //  TEST 2: Run SQL query with no parameters
  const pixels = await myDatabase.sql(
    'SELECT * FROM Pixels'
  )
  if (!Array.isArray(pixels)) {
    throw new Error("Pixels is not an array")
  } else {
    console.log(`✅ Retrieved ${pixels.length} pixel${pixels.length === 1 ? '' : 's'} total`)
  }

  //  TEST 3: Run SQL query with parameters
  const pixels2 = await myDatabase.sql(
    'SELECT * FROM Pixels WHERE x = ? AND y = ?', 3, 4
  )
  if (!Array.isArray(pixels2)) {
    throw new Error("Pixels2 is not an array")
  } else {
    console.log(`✅ Retrieved ${pixels2.length} pixel${pixels2.length === 1 ? '' : 's'} at (3,4)`)
  }
}
test()