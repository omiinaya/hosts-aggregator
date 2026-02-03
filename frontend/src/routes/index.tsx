import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './Dashboard'
import Hosts from './Hosts'
import Sources from './Sources'
import Settings from './Settings'
import NotFound from './NotFound'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/hosts" element={<Hosts />} />
      <Route path="/sources" element={<Sources />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default AppRoutes