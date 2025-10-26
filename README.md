# DataPantry
A simple API wrapper for DataPantry. 

<br/><br/><br/><br/>

## Basic usage

For the full feature documentation, see the [docs](https://datapantry.org/api-docs/npm-package).

Install:
```bash
npm install datapantry
```

Then, on your server:
```js
import DataPantry from 'datapantry';

const db = DataPantry.database('YOUR_API_KEY');

async function test() {
  const schema = await db.schema()  //  { DBname: String, tables: [] }

  //  Use these "chainable" query builders:
  const bluePaperclips = await db.select('*')
    .from('PaperclipCollection')
    .where({ color: 'blue' })

  //  Or if you'd prefer, use raw SQL:
  const redPaperclips = await db.sql(
    'SELECT * FROM PaperclipCollection WHERE color = ?', 'red'
  )
  console.log("Schema:", schema, "Blue Paperclips:", bluePaperclips, "Red Paperclips:", redPaperclips);
}
test()
```