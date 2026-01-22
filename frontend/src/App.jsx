import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import ProjectCard from './components/ProjectCard';

const CONNECTION_STATUS_CONFIG = {
  connecting: {
    label: 'Connessione...',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50'
  },
  connected: {
    label: 'Connesso',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50'
  },
  disconnected: {
    label: 'Disconnesso',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50'
  },
  error: {
    label: 'Errore',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50'
  }
};

function App() {
  const { projects, projectStatuses, connectionStatus } = useWebSocket();
  const statusConfig = CONNECTION_STATUS_CONFIG[connectionStatus];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">
                Claude Code Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Monitoraggio sessioni in tempo reale
              </p>
            </div>

            {/* Connection Status */}
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${statusConfig.bgColor} border border-gray-200`}>
              <div className={`w-3 h-3 rounded-full ${statusConfig.color} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}></div>
              <span className={`font-semibold text-sm ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-6">
            <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <span className="text-blue-600 font-semibold text-sm">
                Progetti: {projects.length}
              </span>
            </div>
            <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <span className="text-green-600 font-semibold text-sm">
                Attivi: {Object.values(projectStatuses).filter(s => s.status === 'active').length}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {connectionStatus === 'connecting' && projects.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mb-4"></div>
            <p className="text-yellow-700 font-semibold">
              Connessione al server in corso...
            </p>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold mb-2">
              Errore di connessione
            </p>
            <p className="text-red-600 text-sm">
              Impossibile connettersi al server WebSocket. Verificare che il backend sia in esecuzione.
            </p>
          </div>
        )}

        {projects.length === 0 && connectionStatus === 'connected' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-700 font-semibold">
              Nessun progetto configurato
            </p>
            <p className="text-blue-600 text-sm mt-2">
              Aggiungere progetti al file backend/config.json
            </p>
          </div>
        )}

        {/* Projects - Three Columns Layout */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Projects Column */}
            <div>
              <div className="mb-4 bg-green-100 border-2 border-green-300 rounded-lg p-3">
                <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                  <span className="text-2xl">🟢</span>
                  Attivi ({projects.filter(p => projectStatuses[p.name]?.status === 'active').length})
                </h3>
              </div>
              <div className="space-y-4">
                {projects
                  .filter(p => projectStatuses[p.name]?.status === 'active')
                  .map((project) => (
                    <ProjectCard
                      key={project.name}
                      project={project}
                      status={projectStatuses[project.name]}
                    />
                  ))}
                {projects.filter(p => projectStatuses[p.name]?.status === 'active').length === 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-500 text-sm">Nessuno attivo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Check Projects Column */}
            <div>
              <div className="mb-4 bg-orange-100 border-2 border-orange-300 rounded-lg p-3">
                <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                  <span className="text-2xl">🟠</span>
                  Da Controllare ({projects.filter(p => projectStatuses[p.name]?.status === 'check').length})
                </h3>
              </div>
              <div className="space-y-4">
                {projects
                  .filter(p => projectStatuses[p.name]?.status === 'check')
                  .map((project) => (
                    <ProjectCard
                      key={project.name}
                      project={project}
                      status={projectStatuses[project.name]}
                    />
                  ))}
                {projects.filter(p => projectStatuses[p.name]?.status === 'check').length === 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-500 text-sm">Nessuno da controllare</p>
                  </div>
                )}
              </div>
            </div>

            {/* Inactive Projects Column */}
            <div>
              <div className="mb-4 bg-gray-100 border-2 border-gray-300 rounded-lg p-3">
                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                  <span className="text-2xl">⚪</span>
                  Inattivi ({projects.filter(p => {
                    const status = projectStatuses[p.name]?.status;
                    return status === 'idle' || status === 'error' || !status;
                  }).length})
                </h3>
              </div>
              <div className="space-y-4">
                {projects
                  .filter(p => {
                    const status = projectStatuses[p.name]?.status;
                    return status === 'idle' || status === 'error' || !status;
                  })
                  .map((project) => (
                    <ProjectCard
                      key={project.name}
                      project={project}
                      status={projectStatuses[project.name]}
                    />
                  ))}
                {projects.filter(p => {
                  const status = projectStatuses[p.name]?.status;
                  return status === 'idle' || status === 'error' || !status;
                }).length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <p className="text-green-600 font-semibold text-sm">Tutti attivi/controllare! 🎉</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>Dashboard Claude Code v1.0.0 - Powered by React + WebSocket</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
