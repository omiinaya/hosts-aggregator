# Hosts Aggregator - Troubleshooting Guide

## Common Issues and Solutions

### Development Issues

#### Backend Won't Start

**Issue:** Backend server fails to start

**Possible Causes:**
- Port 3001 is already in use
- Database connection issues
- Missing environment variables
- TypeScript compilation errors

**Solutions:**
1. **Check port availability:**
   ```bash
   lsof -i :3001
   # If port is in use, kill the process or change PORT in .env
   ```

2. **Verify database connection:**
   ```bash
   cd backend
   npx prisma migrate status
   # If migration issues, run: npx prisma migrate reset
   ```

3. **Check environment variables:**
   ```bash
   # Ensure .env file exists and is properly configured
   cat backend/.env
   ```

4. **Check TypeScript compilation:**
   ```bash
   cd backend
   npm run type-check
   npm run build
   ```

#### Frontend Won't Connect to Backend

**Issue:** Frontend shows connection errors

**Possible Causes:**
- Backend server not running
- CORS configuration issues
- Incorrect API base URL
- Network connectivity problems

**Solutions:**
1. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/api/sources
   # Should return JSON response
   ```

2. **Check CORS configuration:**
   - Verify `ALLOWED_HOSTS` in backend `.env`
   - Ensure frontend URL is included

3. **Verify API base URL:**
   ```bash
   cat frontend/.env
   # Should be: VITE_API_BASE_URL=http://localhost:3001/api
   ```

4. **Check browser console:**
   - Look for CORS errors in browser dev tools
   - Check network tab for failed requests

#### Database Migration Issues

**Issue:** Prisma migrations fail

**Possible Causes:**
- Database file corruption
- Migration conflicts
- Insufficient permissions

**Solutions:**
1. **Reset database:**
   ```bash
   cd backend
   npx prisma migrate reset
   ```

2. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

### Production Issues

#### Application Performance Issues

**Issue:** Slow response times or high resource usage

**Possible Causes:**
- Large hosts file processing
- Database query inefficiencies
- Memory leaks
- Insfficient server resources

**Solutions:**
1. **Monitor resource usage:**
   ```bash
   # Check CPU and memory
   top
   htop
   ```

2. **Optimize database queries:**
   - Add indexes to frequently queried fields
   - Use Prisma query optimization

3. **Implement caching:**
   - Cache frequently accessed data
   - Use Redis for session storage

4. **Scale resources:**
   - Increase server RAM/CPU
   - Implement load balancing

#### File Download Failures

**Issue:** Hosts file downloads fail or are incomplete

**Possible Causes:**
- File generation errors
- Disk space limitations
- Network timeouts
- Browser download issues

**Solutions:**
1. **Check file generation:**
   ```bash
   # Verify generated files exist
   ls -la backend/data/generated/
   ```

2. **Check disk space:**
   ```bash
   df -h
   # Ensure sufficient space for large hosts files
   ```

3. **Test download with curl:**
   ```bash
   curl -o test.txt http://localhost:3001/api/aggregated/download/latest
   ```

4. **Check browser settings:**
   - Disable browser extensions temporarily
   - Try different browser

### API Error Responses

#### 400 Bad Request

**Common Causes:**
- Invalid request body format
- Missing required fields
- Validation errors

**Solutions:**
- Check request body against API documentation
- Verify all required fields are present
- Use proper JSON formatting

#### 404 Not Found

**Common Causes:**
- Invalid endpoint URL
- Resource doesn't exist
- Incorrect ID format

**Solutions:**
- Verify endpoint URL matches documentation
- Check if resource exists in database
- Ensure ID format is correct

#### 429 Too Many Requests

**Common Causes:**
- Rate limit exceeded
- Too many rapid API calls

**Solutions:**
- Implement request throttling
- Add delays between requests
- Check rate limit headers

#### 500 Internal Server Error

**Common Causes:**
- Server-side code errors
- Database connection issues
- File system errors

**Solutions:**
- Check server logs for detailed error messages
- Verify database connectivity
- Check file permissions

### Frontend-Specific Issues

#### React Components Not Rendering

**Issue:** Components fail to render or show errors

**Possible Causes:**
- TypeScript compilation errors
- Missing dependencies
- State management issues

**Solutions:**
1. **Check browser console:**
   - Look for JavaScript errors
   - Check for missing imports

2. **Verify dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Check TypeScript:**
   ```bash
   npm run type-check
   ```

#### State Management Issues

**Issue:** Application state inconsistent or not updating

**Possible Causes:**
- React Query cache issues
- Zustand store problems
- Component re-rendering issues

**Solutions:**
1. **Check React Query devtools:**
   - Install React Query DevTools
   - Monitor query states

2. **Verify Zustand store:**
   - Check store updates
   - Verify action dispatches

3. **Debug re-renders:**
   - Use React DevTools profiler
   - Check dependency arrays

### Database Issues

#### SQLite Database Corruption

**Issue:** Database operations fail with corruption errors

**Solutions:**
1. **Backup current database:**
   ```bash
   cp backend/dev.db backend/dev-backup-$(date +%Y%m%d).db
   ```

2. **Try database repair:**
   ```bash
   sqlite3 backend/dev.db ".dump" | sqlite3 backend/dev-new.db
   ```

3. **Reset database:**
   ```bash
   cd backend
   npx prisma migrate reset
   ```

#### Migration Conflicts

**Issue:** Database migrations fail due to conflicts

**Solutions:**
1. **Check migration history:**
   ```bash
   npx prisma migrate status
   ```

2. **Reset and reapply migrations:**
   ```bash
   npx prisma migrate reset
   npx prisma migrate deploy
   ```

3. **Manual conflict resolution:**
   - Review migration files
   - Manually apply schema changes

### File System Issues

#### Permission Denied Errors

**Issue:** File operations fail with permission errors

**Solutions:**
1. **Check file permissions:**
   ```bash
   ls -la backend/data/
   # Ensure application has write permissions
   ```

2. **Fix permissions:**
   ```bash
   chmod 755 backend/data/
   chmod 644 backend/data/*
   ```

3. **Run as correct user:**
   - Ensure application runs with appropriate user permissions

#### Disk Space Issues

**Issue:** File operations fail due to insufficient disk space

**Solutions:**
1. **Check disk usage:**
   ```bash
   df -h
   du -sh backend/data/
   ```

2. **Clean up old files:**
   ```bash
   # Clean up old generated files
   find backend/data/generated -name "*.txt" -mtime +30 -delete
   ```

3. **Implement cleanup schedule:**
   - Set up cron job for regular cleanup
   - Keep only recent files

### Network and Connectivity Issues

#### CORS Errors

**Issue:** Browser blocks API requests due to CORS policy

**Solutions:**
1. **Verify CORS configuration:**
   ```env
   ALLOWED_HOSTS=http://localhost:3000,https://your-domain.com
   ```

2. **Check request headers:**
   - Ensure proper Origin header
   - Verify Content-Type headers

3. **Development workaround:**
   - Use browser extensions to disable CORS (development only)

#### SSL/TLS Issues

**Issue:** HTTPS connections fail in production

**Solutions:**
1. **Verify certificate validity:**
   ```bash
   openssl s_client -connect your-domain.com:443
   ```

2. **Check certificate chain:**
   - Ensure intermediate certificates are included
   - Verify certificate expiration

3. **Browser testing:**
   - Test in multiple browsers
   - Check browser console for SSL errors

### Performance Optimization

#### Slow Aggregation Process

**Issue:** Hosts file aggregation takes too long

**Solutions:**
1. **Optimize processing algorithm:**
   - Use streaming for large files
   - Implement efficient deduplication

2. **Memory optimization:**
   - Process files in chunks
   - Use efficient data structures

3. **Parallel processing:**
   - Process multiple sources concurrently
   - Use worker threads for CPU-intensive tasks

#### High Memory Usage

**Issue:** Application uses excessive memory

**Solutions:**
1. **Monitor memory usage:**
   ```bash
   # Check Node.js memory usage
   node --max-old-space-size=4096 src/index.ts
   ```

2. **Implement memory limits:**
   - Set memory limits for Node.js
   - Use garbage collection optimization

3. **Code optimization:**
   - Avoid memory leaks
   - Use efficient data structures

## Debugging Techniques

### Logging

**Enable detailed logging:**
```env
LOG_LEVEL=debug
```

**Check application logs:**
```bash
# Backend logs
tail -f backend/logs/app.log

# Frontend logs (browser console)
# Check browser developer tools
```

### Debug Mode

**Enable debug mode:**
```env
NODE_ENV=development
DEBUG=hosts-aggregator:*
```

### Testing Endpoints

**Use curl for API testing:**
```bash
# Test sources endpoint
curl http://localhost:3001/api/sources

# Test aggregation endpoint
curl -X POST http://localhost:3001/api/aggregated

# Test download endpoint
curl -o hosts.txt http://localhost:3001/api/aggregated/download/latest
```

### Database Inspection

**Use Prisma Studio:**
```bash
cd backend
npx prisma studio
```

**Direct SQLite access:**
```bash
sqlite3 backend/dev.db
.tables
SELECT * FROM Source;
```

## Getting Help

If you encounter issues not covered in this guide:

1. **Check the documentation:** Review [`ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`API.md`](docs/API.md), [`DEVELOPMENT.md`](docs/DEVELOPMENT.md)
2. **Search existing issues:** Check the project's issue tracker
3. **Create a detailed bug report:** Include error messages, steps to reproduce, and environment details
4. **Provide logs:** Include relevant application logs and browser console output

Remember to always test changes in a development environment before applying them to production.