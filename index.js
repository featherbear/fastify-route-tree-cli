#!/usr/bin/env node

require('sucrase/register')

import path from 'path'
import fs from 'fs'
import Fastify from 'fastify'
import fastifyRouteTree from 'fastify-route-tree'

const outputFile = process.argv[2]
const renderFile = process.argv[3]
const routeFiles = process.argv.slice(4)

if (!outputFile || !renderFile || routeFiles.length === 0) {
  console.log(
    'Usage: fastify-route-tree-cli <outputFile> <renderFunction> <routeFile1> <routeFile2> <...>'
  )
  process.exit(0)
}

let renderFunction
try {
  renderFunction = require(path.join(process.cwd(), renderFile))
  renderFunction = renderFunction.default || renderFunction

  if (typeof renderFunction !== 'function') {
    throw new Error('Bad fn')
  }
} catch {
  console.error(
    `${renderFile} did not contain a valid default function export!`
  )
  process.exit(1)
}

const routeModules = []
routeFiles.forEach(p => {
  try {
    routeModules.push(require(path.join(process.cwd(), p)))
  } catch (e) {
    console.error(`Could not load path from [${p}]: ${e}`)
  }
})

if (routeModules.length === 0) {
  console.log('No routes files were valid')
  process.exit(1)
}

const fastify = Fastify()
fastify.register(fastifyRouteTree, {
  render: renderFunction
})

routeModules.forEach(m => fastify.register(m))

fastify.ready(async () => {
  console.log('Doing the thing...\n')

  const content = (await fastify.routeTree).render()

  if (typeof content !== undefined) {
    console.info(content)
    fs.writeFileSync(outputFile, content)
  }

  process.exit(0)
})
