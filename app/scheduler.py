from apscheduler.schedulers.asyncio import AsyncIOScheduler
from scripts.load_open5e_data import main as cache_open5e_data_main

scheduler = AsyncIOScheduler()

def setup_scheduler():
    scheduler.add_job(cache_open5e_data_main, 'cron', hour=3, minute=0, name="Daily Cache Job")
    scheduler.add_job(cache_open5e_data_main, name="Initial Startup Cache Job")
    scheduler.start()
    print("Scheduler started. Caching job is scheduled to run daily at 3:00 AM UTC and once on startup.")

def shutdown_scheduler():
    scheduler.shutdown()
