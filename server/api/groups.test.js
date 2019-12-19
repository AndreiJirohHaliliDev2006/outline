/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../app';
import { flushdb } from '../test/support';
import { buildUser, buildGroup, buildGroupUser } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#groups.create', async () => {
  it('should create a group', async () => {
    const name = 'hello I am a group';
    const user = await buildUser({ isAdmin: true });

    const res = await server.post('/api/groups.create', {
      body: { token: user.getJwtToken(), name },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual(name);
  });
});

describe('#groups.update', async () => {
  it('should require authentication', async () => {
    const group = await buildGroup();
    const res = await server.post('/api/groups.update', {
      body: { id: group.id, name: 'Test' },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const group = await buildGroup();
    const user = await buildUser();
    const res = await server.post('/api/groups.update', {
      body: { token: user.getJwtToken(), id: group.id, name: 'Test' },
    });
    expect(res.status).toEqual(403);
  });

  it('should require authorization', async () => {
    const group = await buildGroup();
    const user = await buildUser({ isAdmin: true });

    const res = await server.post('/api/groups.update', {
      body: { token: user.getJwtToken(), id: group.id, name: 'Test' },
    });
    expect(res.status).toEqual(403);
  });

  it('allows admin to edit a group', async () => {
    const user = await buildUser({ isAdmin: true });
    const group = await buildGroup({ teamId: user.teamId });

    const res = await server.post('/api/groups.update', {
      body: { token: user.getJwtToken(), id: group.id, name: 'Test' },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe('Test');
  });
});

describe('#groups.list', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/groups.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should return groups', async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });

    const res = await server.post('/api/groups.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(group.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toEqual(true);
  });
});

describe('#groups.info', async () => {
  it('should return group', async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });

    const res = await server.post('/api/groups.info', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(group.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/groups.info');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const user = await buildUser();
    const group = await buildGroup();
    const res = await server.post('/api/groups.info', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#groups.delete', async () => {
  it('should require authentication', async () => {
    const group = await buildGroup();
    const res = await server.post('/api/groups.delete', {
      body: { id: group.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const group = await buildGroup();
    const user = await buildUser();
    const res = await server.post('/api/groups.delete', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    expect(res.status).toEqual(403);
  });

  it('should require authorization', async () => {
    const group = await buildGroup();
    const user = await buildUser({ isAdmin: true });

    const res = await server.post('/api/groups.delete', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    expect(res.status).toEqual(403);
  });

  it('allows admin to delete a group', async () => {
    const user = await buildUser({ isAdmin: true });
    const group = await buildGroup({ teamId: user.teamId });

    const res = await server.post('/api/groups.delete', {
      body: { token: user.getJwtToken(), id: group.id },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });
});

describe('#groups.memberships', async () => {
  it('should return members in a group', async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });
    const groupUser = await buildGroupUser({
      teamId: user.teamId,
      groupId: group.id,
      userId: user.id,
    });

    const res = await server.post('/api/groups.memberships', {
      body: { token: user.getJwtToken(), id: groupUser.groupId },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
    expect(body.data.groupMemberships.length).toEqual(1);
  });

  it('should allow filtering members in group by name', async () => {
    const user = await buildUser();
    const user2 = await buildUser({ name: "Won't find" });
    const group = await buildGroup({ teamId: user.teamId });

    await buildGroupUser({
      teamId: user.teamId,
      groupId: group.id,
      userId: user.id,
    });

    await buildGroupUser({
      teamId: user2.teamId,
      groupId: group.id,
      userId: user2.id,
    });

    const res = await server.post('/api/groups.memberships', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        query: user.name.slice(0, 3),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/groups.memberships');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const user = await buildUser();
    const group = await buildGroup();

    const res = await server.post('/api/groups.memberships', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    expect(res.status).toEqual(403);
  });
});
