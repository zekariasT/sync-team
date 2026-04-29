import { PrismaClient, Role, TaskState, ChannelType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting comprehensive demo seed...');

  // 1. Clean up existing data (Safe for demo/dev, be careful in prod)
  // We'll delete in reverse order of dependencies
  await prisma.videoReaction.deleteMany({});
  await prisma.videoMessage.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.cycle.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  
  // 2. Create Users
  const users = [
    { id: 'guest-demo-user', name: 'Guest Recruiter', email: 'guest@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest' },
    { id: 'user-jamal', name: 'Jamal Williams', email: 'jamal@syncpoint.dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jamal' },
    { id: 'user-sarah', name: 'Sarah Chen', email: 'sarah@syncpoint.dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: 'user-marcus', name: 'Marcus Thorne', email: 'marcus@syncpoint.dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus' },
    { id: 'user-elena', name: 'Elena Rodriguez', email: 'elena@syncpoint.dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
    { id: 'user-alex', name: 'Alex Kim', email: 'alex@syncpoint.dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: u,
      create: u,
    });
  }

  // 3. Create Teams
  const teams = [
    { id: 'seed-team-id', name: 'SyncPoint Core', description: 'Main product development and strategy' },
    { id: 'team-eng', name: 'Engineering', description: 'Frontend, Backend, and Infrastructure' },
    { id: 'team-design', name: 'Product Design', description: 'UX/UI and Brand Identity' },
  ];

  for (const t of teams) {
    await prisma.team.create({ data: t });
  }

  // 4. Add Members to Teams
  // Everyone in SyncPoint Core
  for (const u of users) {
    await prisma.teamMember.create({
      data: {
        userId: u.id,
        teamId: 'seed-team-id',
        role: u.id === 'user-jamal' || u.id === 'guest-demo-user' ? Role.ADMIN : Role.MEMBER
      }
    });
  }

  // Eng Team
  const engMembers = ['user-jamal', 'user-sarah', 'user-marcus', 'user-alex', 'guest-demo-user'];
  for (const uid of engMembers) {
    await prisma.teamMember.create({
      data: {
        userId: uid,
        teamId: 'team-eng',
        role: uid === 'user-jamal' || uid === 'guest-demo-user' ? Role.ADMIN : Role.MEMBER
      }
    });
  }

  // Design Team
  const designMembers = ['user-elena', 'user-sarah', 'guest-demo-user'];
  for (const uid of designMembers) {
    await prisma.teamMember.create({
      data: {
        userId: uid,
        teamId: 'team-design',
        role: uid === 'user-elena' || uid === 'guest-demo-user' ? Role.ADMIN : Role.MEMBER
      }
    });
  }

  // 5. Create Channels
  const channels = [
    { teamId: 'seed-team-id', name: 'announcements', type: ChannelType.ANNOUNCEMENT },
    { teamId: 'seed-team-id', name: 'general', type: ChannelType.GENERAL },
    { teamId: 'team-eng', name: 'engineering-talk', type: ChannelType.TOPIC },
    { teamId: 'team-eng', name: 'infrastructure-alerts', type: ChannelType.TOPIC },
    { teamId: 'team-design', name: 'design-critique', type: ChannelType.TOPIC },
  ];

  for (const c of channels) {
    await prisma.channel.create({ data: c });
  }

  // 6. Create Cycles
  const now = new Date();
  const cycle14Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const cycle14End = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const cycle15Start = new Date(now.getTime());
  const cycle15End = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const cycle14 = await prisma.cycle.create({
    data: {
      teamId: 'seed-team-id',
      name: 'Cycle 14',
      startDate: cycle14Start,
      endDate: cycle14End,
    }
  });

  const cycle15 = await prisma.cycle.create({
    data: {
      teamId: 'seed-team-id',
      name: 'Cycle 15 (Active)',
      startDate: cycle15Start,
      endDate: cycle15End,
    }
  });

  // 7. Create Projects
  const project1 = await prisma.project.create({
    data: {
      teamId: 'seed-team-id',
      name: 'V2 Dashboard UI Refresh',
      description: 'Overhauling the main workspace UI for better performance and glassmorphism aesthetics.',
    }
  });

  const project2 = await prisma.project.create({
    data: {
      teamId: 'seed-team-id',
      name: 'AI Knowledge Base (RAG)',
      description: 'Integrating vector search to allow users to ask questions about uploaded documentation.',
    }
  });

  // 8. Create Tasks
  const tasks = [
    { 
        teamId: 'seed-team-id', title: 'Implement glassmorphism sidebar', state: TaskState.DONE, 
        assigneeId: 'user-sarah', reporterId: 'user-jamal', projectId: project1.id, cycleId: cycle14.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Optimize Prisma query performance', state: TaskState.DONE, 
        assigneeId: 'user-jamal', reporterId: 'user-jamal', cycleId: cycle14.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Setup Aiven MySQL production instance', state: TaskState.DONE, 
        assigneeId: 'user-marcus', reporterId: 'user-jamal', cycleId: cycle14.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Refactor AuthGuard for Demo mode', state: TaskState.IN_PROGRESS, 
        assigneeId: 'user-jamal', reporterId: 'user-jamal', cycleId: cycle15.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Design new "Pulse" status indicators', state: TaskState.IN_PROGRESS, 
        assigneeId: 'user-elena', reporterId: 'user-sarah', projectId: project1.id, cycleId: cycle15.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Configure Pinecone vector index', state: TaskState.TODO, 
        assigneeId: 'user-marcus', reporterId: 'user-alex', projectId: project2.id, cycleId: cycle15.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Draft API documentation for RAG endpoints', state: TaskState.TODO, 
        assigneeId: 'user-alex', reporterId: 'user-jamal', projectId: project2.id, cycleId: cycle15.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Fix mobile responsiveness on Board view', state: TaskState.IN_REVIEW, 
        assigneeId: 'user-sarah', reporterId: 'user-jamal', cycleId: cycle15.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Add dark mode support to chart components', state: TaskState.TODO, 
        assigneeId: 'user-elena', reporterId: 'user-sarah', projectId: project1.id, cycleId: cycle15.id 
    },
    { 
        teamId: 'seed-team-id', title: 'Implement user session timeout logic', state: TaskState.TODO, 
        assigneeId: 'user-alex', reporterId: 'user-marcus', cycleId: cycle15.id 
    },
  ];

  for (const t of tasks) {
    await prisma.task.create({ data: t });
  }

  // 9. Add some messages
  const generalChannel = await prisma.channel.findFirst({ where: { name: 'general', teamId: 'seed-team-id' } });
  if (generalChannel) {
    await prisma.message.createMany({
        data: [
            { channelId: generalChannel.id, senderId: 'user-jamal', content: 'Welcome to the SyncPoint OS team workspace!' },
            { channelId: generalChannel.id, senderId: 'user-sarah', content: 'Excited to start Cycle 15! The new dashboard looks amazing.' },
            { channelId: generalChannel.id, senderId: 'user-elena', content: 'Agreed! I am finishing up the Design specs for the Pulse component today.' },
            { channelId: generalChannel.id, senderId: 'guest-demo-user', content: 'Hello team! Just dropping in to check the project progress.' },
        ]
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
