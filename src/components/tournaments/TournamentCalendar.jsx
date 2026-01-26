import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function TournamentCalendar({ tournaments }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Get calendar data for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startPadding = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days = []

    // Add padding for days before the 1st
    for (let i = 0; i < startPadding; i++) {
      days.push({ day: null, tournaments: [] })
    }

    // Add each day of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayTournaments = tournaments.filter(t => t.date === dateStr)
      days.push({ day, date: dateStr, tournaments: dayTournaments })
    }

    return days
  }, [tournaments, currentYear, currentMonth])

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const today = new Date()
  const isToday = (dateStr) => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return dateStr === todayStr
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          {MONTHS[currentMonth]} {currentYear}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Today
          </button>
          <button
            onClick={goToPrevMonth}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            &larr;
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b">
        {DAYS.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((dayData, index) => (
          <div
            key={index}
            className={`min-h-24 p-1 border-b border-r ${
              dayData.day === null ? 'bg-gray-50' : ''
            } ${isToday(dayData.date) ? 'bg-blue-50' : ''}`}
          >
            {dayData.day && (
              <>
                <div className={`text-sm font-medium mb-1 ${
                  isToday(dayData.date) ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {dayData.day}
                </div>
                <div className="space-y-1">
                  {dayData.tournaments.map(tournament => (
                    <Link
                      key={tournament.id}
                      to={`/tournaments/${tournament.id}`}
                      className={`block p-1 text-xs rounded truncate ${
                        tournament.type === 'coed'
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      title={tournament.name}
                    >
                      {tournament.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Upcoming Tournaments List */}
      <div className="p-4 border-t">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Upcoming Tournaments</h3>
        <div className="space-y-2">
          {tournaments
            .filter(t => new Date(t.date) >= new Date(today.toDateString()))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5)
            .map(tournament => (
              <Link
                key={tournament.id}
                to={`/tournaments/${tournament.id}`}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
              >
                {tournament.image_url && (
                  <img
                    src={tournament.image_url}
                    alt=""
                    className="w-10 h-10 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{tournament.name}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(tournament.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                    {tournament.location && ` • ${tournament.location}`}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  tournament.type === 'coed'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {tournament.type === 'coed' ? 'Coed' : 'Mens'}
                </span>
              </Link>
            ))}
          {tournaments.filter(t => new Date(t.date) >= new Date(today.toDateString())).length === 0 && (
            <p className="text-sm text-gray-500">No upcoming tournaments</p>
          )}
        </div>
      </div>
    </div>
  )
}
