import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  composeAssociationForPort,
  createComposeRuntimeAssociationReader,
} from '../lib/compose-association.js'

test('Compose reader discovers bounded nested files, parses service publishers, and skips generated directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ri-compose-'))
  try {
    await mkdir(join(root, 'demo', 'nested'), { recursive: true })
    await mkdir(join(root, 'node_modules', 'ignored'), { recursive: true })
    await writeFile(join(root, 'demo', 'nested', 'compose.yaml'), 'services: {}')
    await writeFile(join(root, 'node_modules', 'ignored', 'compose.yaml'), 'services: {}')
    const calls = []
    const reader = createComposeRuntimeAssociationReader({
      command: file => {
        calls.push(file)
        return {
          status: 0,
          stdout: JSON.stringify([{
            Service: 'redis',
            Image: 'redis:7-alpine',
            ID: 'abc123',
            Project: 'runtime-story',
            Publishers: [{ PublishedPort: 6379, TargetPort: 6379, Protocol: 'tcp' }],
          }]),
        }
      },
    })
    const result = reader.readWithStatus(root)
    const associations = result.associations
    assert.equal(result.status, 'available')
    assert.equal(calls.length, 1)
    assert.match(calls[0], /demo[\\/]nested[\\/]compose\.yaml$/u)
    assert.deepEqual(associations[0], {
      composeFile: calls[0],
      relativeComposeFile: 'demo/nested/compose.yaml',
      service: 'redis',
      image: 'redis:7-alpine',
      containerId: 'abc123',
      projectName: 'runtime-story',
      hostPort: 6379,
      containerPort: 6379,
      protocol: 'tcp',
    })
    assert.equal(composeAssociationForPort(associations, 'tcp4', 6379)?.service, 'redis')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Compose reader fails closed on malformed output and ambiguous port matches', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ri-compose-'))
  try {
    await writeFile(join(root, 'compose.yml'), 'services: {}')
    const reader = createComposeRuntimeAssociationReader({
      command: () => ({ status: 0, stdout: '{not-json}' }),
    })
    assert.deepEqual(reader.read(root), [])
    assert.equal(reader.readWithStatus(root).status, 'unavailable')

    const ambiguous = createComposeRuntimeAssociationReader({
      command: () => ({
        status: 0,
        stdout: JSON.stringify([
          { Service: 'one', Image: 'redis:7', ID: 'container-one', Publishers: [{ PublishedPort: 6379, TargetPort: 6379, Protocol: 'tcp' }] },
          { Service: 'two', Image: 'redis:7', ID: 'container-two', Publishers: [{ PublishedPort: 6379, TargetPort: 6379, Protocol: 'tcp' }] },
        ]),
      }),
    })
    assert.equal(composeAssociationForPort(ambiguous.read(root), 'tcp4', 6379), undefined)

    for (const stdout of [
      JSON.stringify([{ Service: 'redis', Image: 'redis:7', ID: 'container-redis', Publishers: [{}] }]),
      JSON.stringify([{ Service: 'redis', Image: 'redis:7', ID: 'container-redis', Publishers: ['unexpected'] }]),
      JSON.stringify([{ Service: 'redis', Image: 'redis:7', ID: 'container-redis', Publishers: [{ PublishedPort: '6379', TargetPort: 6379, Protocol: 'tcp' }] }]),
      JSON.stringify([{ Service: 'redis', Image: 'redis:7', ID: 'container-redis', Publishers: [{ PublishedPort: 6379, TargetPort: 6379 }] }]),
      JSON.stringify([{ Service: 'redis', Image: 'redis:7', Publishers: [{ PublishedPort: 6379, TargetPort: 6379, Protocol: 'tcp' }] }]),
    ]) {
      const unknownShape = createComposeRuntimeAssociationReader({ command: () => ({ status: 0, stdout }) })
      assert.equal(unknownShape.readWithStatus(root).status, 'unavailable')
      assert.deepEqual(unknownShape.read(root), [])
    }

    const unavailable = createComposeRuntimeAssociationReader({ command: () => ({ status: null, stdout: '' }) })
    assert.equal(unavailable.readWithStatus(root).status, 'unavailable')

    const malformedSeam = createComposeRuntimeAssociationReader({
      command: () => null,
      projectNames: () => null,
    })
    assert.equal(malformedSeam.readWithStatus(root).status, 'unavailable')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Compose reader retries with a Docker-verified custom project name', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ri-compose-'))
  try {
    await writeFile(join(root, 'compose.yaml'), 'services: {}')
    const calls = []
    const reader = createComposeRuntimeAssociationReader({
      command: (file, projectName) => {
        calls.push({ file, projectName })
        return projectName === 'custom-project'
          ? {
              status: 0,
              stdout: JSON.stringify([{
                Service: 'postgres',
                Image: 'postgres:17-alpine',
                ID: 'container-postgres',
                Project: 'custom-project',
                Publishers: [{ PublishedPort: 5432, TargetPort: 5432, Protocol: 'tcp' }],
              }]),
            }
          : { status: 1, stdout: '' }
      },
      projectNames: () => ['custom-project'],
    })

    const result = reader.readWithStatus(root)
    assert.equal(result.status, 'available')
    assert.equal(result.associations[0].projectName, 'custom-project')
    assert.deepEqual(calls.map(call => call.projectName), [undefined, 'custom-project'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Compose reader bounds candidate discovery and output size', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ri-compose-'))
  try {
    await mkdir(join(root, 'a'), { recursive: true })
    await mkdir(join(root, 'b'), { recursive: true })
    await writeFile(join(root, 'a', 'compose.yaml'), 'services: {}')
    await writeFile(join(root, 'b', 'compose.yaml'), 'services: {}')
    const calls = []
    const boundedReader = createComposeRuntimeAssociationReader({
      maxCandidates: 1,
      command: file => {
        calls.push(file)
        return { status: 0, stdout: JSON.stringify([]) }
      },
    })
    assert.equal(boundedReader.readWithStatus(root).status, 'available')
    assert.equal(calls.length, 1)

    const oversized = createComposeRuntimeAssociationReader({
      maxOutputBytes: 8,
      command: () => ({ status: 0, stdout: '[{"too":"large"}]' }),
    })
    assert.equal(oversized.readWithStatus(root).status, 'unavailable')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Compose reader rejects remote or malformed Docker contexts before querying services', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ri-compose-'))
  try {
    await writeFile(join(root, 'compose.yaml'), 'services: {}')
    for (const endpoint of [undefined, 'ssh://docker.example', 'tcp://10.0.0.2:2375', 'unix:///var/run/docker.sock']) {
      let queried = false
      const reader = createComposeRuntimeAssociationReader({
        contextProbe: () => endpoint === undefined ? undefined : { name: 'remote', endpoint },
        command: () => {
          queried = true
          return { status: 0, stdout: '[]' }
        },
      })
      assert.equal(reader.readWithStatus(root).status, 'unavailable')
      assert.equal(queried, false)
    }

    let queried = false
    const localReader = createComposeRuntimeAssociationReader({
      contextProbe: () => ({ name: 'desktop-linux', endpoint: 'npipe:////./pipe/dockerDesktopLinuxEngine' }),
      command: () => {
        queried = true
        return { status: 0, stdout: '[]' }
      },
    })
    assert.equal(localReader.readWithStatus(root).status, 'available')
    assert.equal(queried, true)

    const malformedRunner = createComposeRuntimeAssociationReader({ dockerRunner: () => null })
    assert.equal(malformedRunner.readWithStatus(root).status, 'unavailable')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Compose reader binds every production Docker query to the validated context', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ri-compose-'))
  try {
    await writeFile(join(root, 'compose.yaml'), 'services: {}')
    const calls = []
    const reader = createComposeRuntimeAssociationReader({
      dockerRunner: (args, cwd) => {
        calls.push({ args, cwd })
        if (args[0] === 'context' && args[1] === 'show') return { status: 0, stdout: 'desktop-linux\n' }
        if (args[0] === '--context' && args[1] === 'desktop-linux' && args[2] === 'context') {
          return { status: 0, stdout: JSON.stringify('npipe:////./pipe/dockerDesktopLinuxEngine') }
        }
        if (args[0] === '--context' && args[1] === 'desktop-linux' && args[2] === 'compose') {
          return {
            status: 0,
            stdout: JSON.stringify([{
              Service: 'redis',
              Image: 'redis:7',
              ID: 'container-redis',
              Publishers: [{ PublishedPort: 6379, TargetPort: 6379, Protocol: 'tcp' }],
            }]),
          }
        }
        return { status: 1, stdout: '' }
      },
    })

    assert.equal(reader.readWithStatus(root).status, 'available')
    assert.deepEqual(calls.map(call => call.args[0]), ['context', '--context', '--context'])
    assert.ok(calls.slice(1).every(call => call.args.slice(0, 2).join(' ') === '--context desktop-linux'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
