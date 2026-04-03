import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy data...');

  // 1. Create a "SyncPoint Core" Team if it doesn't exist
  const team = await prisma.team.upsert({
    where: { id: 'seed-team-id' },
    update: {},
    create: {
      id: 'seed-team-id',
      name: 'SyncPoint Core',
      description: 'The primary development and operations team for SyncPoint OS.',
    },
  });

  // 2. Create some dummy Users
  const users = [
    {
      id: 'user-sarah',
      email: 'sarah@example.com',
      name: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      status: 'In Deep Work 🧘',
      timezone: 'America/Los_Angeles',
    },
    {
      id: 'user-marcus',
      email: 'marcus@example.com',
      name: 'Marcus Miller',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      status: 'Reviewing PRs 💻',
      timezone: 'Europe/London',
    },
    {
      id: 'user-elena',
      email: 'elena@example.com',
      name: 'Elena Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
      status: 'On a Coffee Break ☕',
      timezone: 'Europe/Madrid',
    },
    {
      id: 'user-jamal',
      email: 'jamal@example.com',
      name: 'Jamal Washington',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      status: 'Available',
      timezone: 'Asia/Dubai',
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { id: userData.id },
      update: userData,
      create: userData,
    });

    // Add user to team
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
      update: {},
      create: {
        userId: user.id,
        teamId: team.id,
        role: 'MEMBER',
      },
    });
  }

  // 3. Create Channels
  const channelNames = ['development', 'design-ops', 'announcements'];
  const channels: any[] = [];

  for (const name of channelNames) {
    const channel = await prisma.channel.create({
      data: {
        name,
        teamId: team.id,
      },
    });
    channels.push(channel);
  }

  // 4. Create dummy Messages to test AI summarization
  const devChannel = channels.find(c => c.name === 'development');
  if (devChannel) {
    const messages = [
      { senderId: 'user-marcus', content: 'Hey everyone, I just found a critical bug in the WebSocket logic.' },
      { senderId: 'user-sarah', content: 'Oh no, what happened? I thought we tested that yesterday.' },
      { senderId: 'user-marcus', content: 'The rooms are not being cleaned up properly on disconnect. Might cause a leak.' },
      { senderId: 'user-jamal', content: 'I can help fix that. I worked on something similar before.' },
      { senderId: 'user-marcus', content: 'Great, I will assign the ticket to you Jamal. Let me know if you need any context.' },
      { senderId: 'user-sarah', content: 'I will finish the current feature and then review the fix.' },
    ];

    for (const msg of messages) {
       await prisma.message.create({
         data: {
           channelId: devChannel.id,
           senderId: msg.senderId,
           content: msg.content,
         }
       });
    }
  }

  const designChannel = channels.find(c => c.name === 'design-ops');
  if (designChannel) {
    const messages = [
      { senderId: 'user-elena', content: 'The new color palette is ready for review in Figma.' },
      { senderId: 'user-sarah', content: 'Looking good! I love the new primary blue.' },
      { senderId: 'user-elena', content: 'I also updated the button components with smoother borders.' },
    ];

    for (const msg of messages) {
       await prisma.message.create({
         data: {
           channelId: designChannel.id,
           senderId: msg.senderId,
           content: msg.content,
         }
       });
    }
  }

  // 5. Create dummy Tasks across all board states
  const dummyTasks = [
    // TODO
    { title: 'Design onboarding flow wireframes', state: 'TODO', assigneeId: 'user-elena', reporterId: 'user-sarah' },
    { title: 'Set up error monitoring with Sentry', state: 'TODO', assigneeId: 'user-marcus', reporterId: 'user-sarah' },
    { title: 'Write API docs for /members endpoint', state: 'TODO', reporterId: 'user-jamal' },
    // IN_PROGRESS
    { title: 'Implement Kanban drag-and-drop board', state: 'IN_PROGRESS', assigneeId: 'user-marcus', reporterId: 'user-sarah' },
    { title: 'Build async video transcription pipeline', state: 'IN_PROGRESS', assigneeId: 'user-sarah', reporterId: 'user-sarah' },
    { title: 'Migrate DB to use Prisma migrations', state: 'IN_PROGRESS', assigneeId: 'user-jamal', reporterId: 'user-marcus' },
    // IN_REVIEW
    { title: 'Add timestamped video reactions', state: 'IN_REVIEW', assigneeId: 'user-sarah', reporterId: 'user-marcus' },
    { title: 'Fix WebSocket room cleanup on disconnect', state: 'IN_REVIEW', assigneeId: 'user-jamal', reporterId: 'user-marcus' },
    // DONE
    { title: 'Scaffold NestJS backend with Prisma', state: 'DONE', assigneeId: 'user-marcus', reporterId: 'user-sarah' },
    { title: 'Deploy Prisma schema to MariaDB', state: 'DONE', assigneeId: 'user-sarah', reporterId: 'user-sarah' },
    { title: 'Set up Clerk auth integration', state: 'DONE', assigneeId: 'user-elena', reporterId: 'user-marcus' },
  ];

  for (const task of dummyTasks) {
    await prisma.task.create({
      data: {
        teamId: team.id,
        title: task.title,
        state: task.state as any,
        assigneeId: (task as any).assigneeId || null,
        reporterId: task.reporterId,
      },
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
