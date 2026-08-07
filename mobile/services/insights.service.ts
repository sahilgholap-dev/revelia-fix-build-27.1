import { api } from '@/lib/api';
import { 
  DailyInsightOutput, 
  DailyTeaserOutput,
  WeeklyForecastOutput, 
  MonthlyReadingOutput 
} from '@shared/types';

export const insightsService = {
  // Get full daily insight (Premium Plus only)
  async getDailyInsight() {
    const response = await api.get('/insights/daily');
    return response.data;
  },
  
  // Get daily teaser (all users)
  async getDailyTeaser() {
    const response = await api.get('/insights/daily/teaser');
    return response.data;
  },
  
  // Get weekly forecast (Premium Plus only)
  async getWeeklyForecast() {
    const response = await api.get('/insights/weekly');
    return response.data;
  },
  
  // Get monthly reading (tier-based content)
  async getMonthlyReading() {
    const response = await api.get('/insights/monthly');
    return response.data;
  }
};

export default insightsService;
