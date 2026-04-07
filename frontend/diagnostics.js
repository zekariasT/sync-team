const fs = require('fs');
const path = require('path');

console.log('\n🔍 --- SYNCPOINT DIAGNOSTICS START ---');
console.log('📍 Node Version:', process.version);
console.log('📍 Current Working Directory:', process.cwd());

// Check if Clerk is actually there and what version it is
const clerkPath = path.join(process.cwd(), 'node_modules', '@clerk', 'nextjs', 'package.json');
if (fs.existsSync(clerkPath)) {
  const pkg = JSON.parse(fs.readFileSync(clerkPath, 'utf8'));
  console.log('✅ Clerk Nextjs Version:', pkg.version);
  console.log('📦 Clerk Imports Map:', JSON.stringify(pkg.imports, null, 2));
} else {
  console.log('❌ ERR: @clerk/nextjs NOT FOUND in node_modules');
}

// Check for the #crypto files specifically
const sharedPath = path.join(process.cwd(), 'node_modules', '@clerk', 'shared', 'package.json');
if (fs.existsSync(sharedPath)) {
    const sharedPkg = JSON.parse(fs.readFileSync(sharedPath, 'utf8'));
    console.log('✅ Clerk Shared Version:', sharedPkg.version);
    console.log('📦 Shared #crypto Mapping:', JSON.stringify(sharedPkg.imports?.['#crypto'], null, 2));
}

console.log('🔍 --- SYNCPOINT DIAGNOSTICS END ---\n');