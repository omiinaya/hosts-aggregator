import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './Dashboard'
import Sources from './Sources'
import Aggregate from './Aggregate'
import Download from './Download'
import Settings from './Settings'
import NotFound from './NotFound'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/sources" element={<Sources />} />
      <Route path="/aggregate" element={<Aggregate />} />
      <Route path="/download" element={<Download />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default AppRoutes