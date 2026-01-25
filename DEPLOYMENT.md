# Deployment Guide - IC HDL Generator

This guide covers deploying the IC HDL Generator to various cloud platforms.

## 🚀 Quick Deploy Options

### Option 1: Render (Recommended - Free Tier Available)

**Why Render?**
- ✅ Free tier with 750 hours/month
- ✅ Automatic HTTPS
- ✅ Easy database persistence
- ✅ Zero configuration needed

**Steps:**
1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect `render.yaml` configuration
6. Click "Create Web Service"
7. Wait 2-3 minutes for deployment
8. Your app will be live at `https://your-app-name.onrender.com`

**Manual Configuration (if needed):**
- **Build Command:** `cd backend && pip install -r requirements.txt && python seed_db.py`
- **Start Command:** `cd backend && gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
- **Environment:** Python 3.11

---

### Option 2: Railway (Very Easy - Free $5 Credit)

**Why Railway?**
- ✅ $5 free credit (enough for testing)
- ✅ GitHub integration
- ✅ Automatic deployments
- ✅ Great developer experience

**Steps:**
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "Start a New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway auto-detects Dockerfile
7. Click "Deploy"
8. Get your public URL from dashboard

**Configuration:**
Railway will use the `railway.json` and `Dockerfile` automatically!

---

### Option 3: Fly.io (Docker-based)

**Why Fly.io?**
- ✅ Free tier (3 VMs with 256MB RAM each)
- ✅ Global edge deployment
- ✅ Great for Docker apps

**Steps:**
1. Install Fly CLI:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. Login and deploy:
   ```bash
   fly auth login
   fly launch
   # Answer prompts (select region, etc.)
   fly deploy
   ```

3. Your app will be at `https://your-app-name.fly.dev`

---

### Option 4: Docker Manually (Any Platform)

If you prefer to deploy using Docker on any platform (DigitalOcean, AWS, Azure, etc.):

```bash
# Build the image
docker build -t ic-hdl-generator .

# Run locally to test
docker run -p 8000:8000 ic-hdl-generator

# Push to a registry
docker tag ic-hdl-generator your-registry/ic-hdl-generator
docker push your-registry/ic-hdl-generator

# Deploy to your platform
```

---

## 📋 Pre-Deployment Checklist

- [ ] Code pushed to Git repository (GitHub/GitLab)
- [ ] Database seeding works (`python seed_db.py`)
- [ ] All tests pass
- [ ] `requirements.txt` includes `gunicorn`
- [ ] Static files are properly configured
- [ ] CORS settings reviewed (currently allows all origins)

---

## 🔧 Production Considerations

### Database
**Current:** SQLite (included in repo)
- ✅ Simple, portable
- ⚠️ Not ideal for high traffic
- ✅ Perfect for educational/demo use

**For Production Scale:**
- Consider PostgreSQL for >100 concurrent users
- Update `database.py` connection string
- Use environment variable for DATABASE_URL

### Static Files
Current configuration serves static files via FastAPI which is fine for this educational app.

### Environment Variables
Set these if needed:
- `PORT` - Will be set by platform automatically
- `DATABASE_URL` - Optional for PostgreSQL
- `ALLOWED_ORIGINS` - For CORS configuration

### Performance
Current settings:
- 2 Gunicorn workers (adjust based on platform)
- Uvicorn worker class for async support
- Health check endpoint at `/health`

---

## 🌐 Post-Deployment

### Test Your Deployment
1. Visit your deployed URL
2. Navigate to `/ics-view` - Should load IC database
3. Open `/designer` - Test circuit designer
4. Try `/boolean/tool` - Boolean logic conversion
5. Check `/health` endpoint - Should return `{"status": "healthy"}`

### Custom Domain (Optional)
Most platforms support custom domains:
- **Render:** Project Settings → Custom Domain
- **Railway:** Project → Settings → Domains
- **Fly.io:** `fly domains add yourdomain.com`

### Monitor Your App
- Enable platform logging
- Set up uptime monitoring (UptimeRobot, etc.)
- Monitor resource usage on platform dashboard

---

## 🐛 Troubleshooting

### Database Not Seeding
**Problem:** Empty IC database after deployment
**Solution:** Ensure `python seed_db.py` runs in build command

### Static Files Not Loading
**Problem:** CSS/JS files return 404
**Solution:** Check `static/` directory is included in deployment

### Port Binding Error
**Problem:** App fails to bind to port
**Solution:** Ensure using `$PORT` environment variable:
```python
import os
port = int(os.getenv("PORT", 8000))
```

### Memory Issues
**Problem:** App crashes due to memory
**Solution:** 
- Reduce Gunicorn workers to 1
- Choose platform with more RAM
- Optimize database queries

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| Render | 750 hrs/mo | $7/mo | Educational/Demo |
| Railway | $5 credit | $5/mo usage | Development |
| Fly.io | 3 VMs free | Pay as you go | Production |
| Heroku | None | $7/mo | Legacy apps |

---

## 🎯 Recommended Path

**For this project**, I recommend:

1. **Start with Render** (easiest, free tier)
2. **Or Railway** (good free credit)
3. **Scale to Fly.io** if you need global deployment

All three work great with our FastAPI + SQLite stack!

---

## 📞 Need Help?

Common deployment issues:
1. **Build fails:** Check Python version (needs 3.11+)
2. **Database empty:** Verify seed_db.py runs
3. **Port errors:** Platform should set $PORT automatically
4. **Static files 404:** Ensure `/static` mount path correct

---

**Ready to deploy!** Choose your platform above and follow the steps. Your IC HDL Generator will be live in minutes! 🚀
