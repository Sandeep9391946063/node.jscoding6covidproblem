const express = require('express')
const path = require('path')
const {open} = require('sqlite')

const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())
const dpPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dpPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

// get list
const convertStateDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const ConvertDistrictPascalCase = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const GetAllStatesQuery = `
    SELECT 
    *
    FROM
    state;
  `
  const stateArray = await db.all(GetAllStatesQuery)
  response.send(
    stateArray.map(stateObj => convertStateDbObjectToResponseObject(stateobj)),
  )
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params

  const getStateIdQuery = `
    SELECT * 
    FROM
    state
    WHERE
    state_id = ${stateId};
  `
  const state = await db.get(getStateIdQuery)

  response.send(convertStateDbObjectToResponseObject(state))
})

app.post('/districts/', async (request, response) => {
  const districtDetails = request.body

  const {districtName, stateId, cases, cured, active, deaths} = districtDetails

  const AddDistrictQuery = `
      INSERT INTO
      district(district_name,state_id,cases,cured,active,deaths)
      VALUES
      '${districtName}',
      '${stateId}',
      '${cases}',
      '${cured}',
      '${active}',
      '${deaths}'; `

  const dbResponse = await db.run(AddDistrictQuery)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params

  const getDistrictQuery = `
    SELECT
    *
    FROM
    district 
    WHERE
    district_id = ${districtId};
  `

  const district = await db.get(getDistrictQuery)
  response.send(ConvertDistrictPascalCase(district))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params

  const DeleteQueary = `
      DELETE FROM
      district 
      WHERE
      district_id = ${districtId};
  `
  await db.run(DeleteQueary)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const DistrictDetails = request.body

  const {districtName, stateId, cases, cured, active, deaths} = DistrictDetails

  const UpdateDistrictQuery = `
    UPDATE
    district
    SET
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}',
  `
  await db.run(UpdateDistrictQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getDistrictStaticsQuery = `
    SELECT
    SUM(cases) as totalCases,
    SUM(cured) as totalCured,
    SUM(active) as totalActive,
    SUM(deaths) as totalDeaths
    FROM 
    district 
    WHERE
    state_id = ${stateId};`
  const district = await db.get(getDistrictStaticsQuery)

  response(district)
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
  SELECT 
  state_name AS stateName
  FROM
  district INNER JOIN state ON district.state_id = state_id
  WHERE
  district_id = ${districtId};`
  const stateName = await db.get(getDistrictQuery)

  response.send(stateName)
})

module.exports = app
