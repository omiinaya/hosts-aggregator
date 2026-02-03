# Coolify Deployment Fix

## Problem Summary

When deploying to Coolify, the build failed with the error:

```
sh: 1: tsc: not found
```

This occurred because:

1. **Root `package.json` had `concurrently` in `devDependencies`**: Nixpacks runs `npm ci` with `--omit=dev` flag in production mode, which excludes devDependencies. Since `concurrently` was only in devDependencies, it wasn't installed during the build.

2. **No Nixpacks configuration**: Without explicit configuration, Nixpacks couldn't properly handle the monorepo structure with separate backend and frontend directories.

3. **Monorepo structure not handled**: The build process didn't install dependencies in the `backend/` and `frontend/` subdirectories before attempting to build.

## Solution Implemented

### 1. Moved `concurrently` to Dependencies

**File**: [`package.json`](package.json:17)

Changed `concurrently` from `devDependencies` to `dependencies`:

```json
{
  "dependencies": {
    "concurrently": "^8.2.2"
  }
}
```

This ensures `concurrently` is available during production builds.

### 2. Created Nixpacks Configuration

**File**: [`nixpacks.toml`](nixpacks.toml:1)

Added explicit Nixpacks configuration to handle the monorepo:

```toml
[phases.build]
cmds = ["npm run build"]

[phases.start]
cmds = ["cd backend && npm start"]

[variables]
NODE_ENV = "production"
```

This configuration:
- Builds both applications concurrently using the root `npm run build` script
- Starts the backend server (which serves the frontend)
- Nixpacks automatically handles dependency installation via `npm ci`

### 3. Fixed TypeScript Error

**File**: [`frontend/src/routes/Hosts.tsx`](frontend/src/routes/Hosts.tsx:148)

Fixed a TypeScript error where `params.search` could be `undefined` but the component expected a `string`:

```typescript
// Before
searchValue={params.search}

// After
searchValue={params.search || ''}
```

### 4. Updated Deployment Documentation

**File**: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md:8)

Added comprehensive Coolify deployment section with:
- Step-by-step deployment instructions
- Environment variable configuration
- Troubleshooting guide
- Best practices for Coolify deployments

## How to Deploy to Coolify

### Prerequisites

- Coolify instance running (self-hosted or cloud)
- Git repository with your code
- Domain name configured (optional)

### Deployment Steps

1. **Connect your repository to Coolify:**
   - Go to your Coolify dashboard
   - Click "New Service" → "Git Repository"
   - Connect your Git provider (GitHub, GitLab, etc.)
   - Select the `hosts-aggregator` repository

2. **Configure the service:**
   - **Branch:** Select `main` (or your production branch)
   - **Build Type:** Nixpacks (auto-detected)
   - **Environment Variables:** Add required variables

3. **Set environment variables:**

   ```env
   # Backend Configuration
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=file:./data/dev.db
   CACHE_DIR=./data/cache
   GENERATED_DIR=./data/generated
   MAX_FILE_SIZE=10485760
   ALLOWED_HOSTS=your-domain.com
   LOG_LEVEL=info
   
   # Frontend Configuration
   VITE_API_BASE_URL=https://your-domain.com/api
   VITE_APP_NAME="Hosts Aggregator"
   VITE_APP_VERSION=1.0.0
   ```

4. **Deploy:**
   - Click "Deploy" in Coolify
   - Coolify will automatically build and deploy your application
   - Monitor the deployment logs for any issues

## Verification

The build was tested locally and succeeded:

```bash
npm run build
```

Output:
```
> hosts-aggregator@1.0.0 build
> concurrently "npm run build:backend" "npm run build:frontend"

[0] > hosts-aggregator-backend@1.0.0 build
[0] > cd backend && npm run build
[0] 
[1] > hosts-aggregator@1.0.0 build:frontend
[1] > cd frontend && npm run build
[1] 
[0] > tsc
[0] npm run build:backend exited with code 0
[1] vite v5.4.21 building for production...
[1] ✓ 1508 modules transformed.
[1] ✓ built in 6.03s
[1] npm run build:frontend exited with code 0
```

## Troubleshooting

### Build fails with "tsc: not found"

**Solution:** Ensure [`nixpacks.toml`](nixpacks.toml:1) is present in the repository root and `concurrently` is in `dependencies` (not `devDependencies`) in root [`package.json`](package.json:17).

### Application won't start

**Solution:** Check environment variables are set correctly, verify database migrations have run, and check Coolify logs for specific error messages.

### Frontend not accessible

**Solution:** Ensure `VITE_API_BASE_URL` is set correctly, check that the backend is serving the frontend static files, and verify the domain configuration in Coolify.

## Files Modified

1. [`package.json`](package.json:17) - Moved `concurrently` to dependencies
2. [`nixpacks.toml`](nixpacks.toml:1) - Created Nixpacks configuration
3. [`frontend/src/routes/Hosts.tsx`](frontend/src/routes/Hosts.tsx:148) - Fixed TypeScript error
4. [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md:8) - Added Coolify deployment documentation

## Next Steps

1. Commit and push these changes to your repository
2. Deploy to Coolify using the updated configuration
3. Monitor the deployment logs to ensure success
4. Test the deployed application

## Additional Resources

- [Coolify Documentation](https://coolify.io/docs)
- [Nixpacks Documentation](https://nixpacks.com/docs)
- [Deployment Guide](./DEPLOYMENT.md)
