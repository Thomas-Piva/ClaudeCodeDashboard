import React, { useState } from 'react';

const STATUS_CONFIG = {
  active: {
    color: 'bg-green-500',
    label: 'Attivo',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  check: {
    color: 'bg-orange-500',
    label: 'Controllare',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  idle: {
    color: 'bg-gray-400',
    label: 'Inattivo',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  error: {
    color: 'bg-red-500',
    label: 'Errore',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
};

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function ProjectCard({ project, status }) {
  const statusInfo = status?.status ? STATUS_CONFIG[status.status] : STATUS_CONFIG.idle;
  const [showFullOutput, setShowFullOutput] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkAsChecked = async () => {
    if (isMarking) return;

    setIsMarking(true);
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${encodeURIComponent(project.name)}/mark-checked`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Errore nel segnare come controllato');
      }

      console.log(`✓ ${project.name} segnato come controllato`);
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nel segnare il progetto come controllato');
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div
      className={`rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} p-6 shadow-lg transition-all hover:shadow-xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${statusInfo.color} animate-pulse`}></div>
          <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.textColor} bg-white border ${statusInfo.borderColor}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Pulsante Segna come Controllato */}
      {status?.status === 'check' && (
        <div className="mb-4">
          <button
            onClick={handleMarkAsChecked}
            disabled={isMarking}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isMarking ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Segno come controllato...
              </>
            ) : (
              <>
                <span>✓</span>
                Segna come Controllato
              </>
            )}
          </button>
        </div>
      )}

      {/* Path */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 font-mono break-all">
          {project.path}
        </p>
      </div>

      {/* Session Info */}
      {status?.sessionId && (
        <div className="mb-4 space-y-2">
          {status.slug && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">📝</span>
              <p className="text-sm text-purple-600 font-semibold">
                {status.slug}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">🔑</span>
            <p className="text-xs text-gray-500 font-mono">
              {status.sessionId.substring(0, 8)}...
            </p>
          </div>
          {status.gitBranch && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">🌿</span>
              <p className="text-xs text-blue-600 font-mono">
                {status.gitBranch}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status Info */}
      <div className="space-y-3">
        {/* Ultimo aggiornamento */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Ultimo aggiornamento</p>
          <p className="text-sm font-semibold text-gray-700">
            {status?.lastUpdate ? formatTimestamp(status.lastUpdate) : 'N/A'}
          </p>
        </div>

        {/* Output sessione */}
        {status && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Output sessione</p>
              {status.outputHistory && status.outputHistory.length > 0 && (
                <button
                  onClick={() => setShowFullOutput(!showFullOutput)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  {showFullOutput ? '▼ Nascondi' : '▶ Mostra tutto'}
                </button>
              )}
            </div>

            {!showFullOutput ? (
              /* Visualizzazione collassata */
              <div>
                {status.status === 'active' ? (
                  <div>
                    <p className="text-sm text-gray-600 italic mb-2">
                      ⚡ Sessione in corso...
                    </p>
                    {(status.fullText || status.lastOutput) && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {status.fullText || status.lastOutput}
                      </p>
                    )}
                  </div>
                ) : status.status === 'check' ? (
                  <div>
                    <p className="text-sm text-orange-600 font-semibold mb-2">
                      ✅ Completato - Da controllare
                    </p>
                    {status.lastOutput && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {status.lastOutput}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    💤 Sessione inattiva
                  </p>
                )}
              </div>
            ) : (
              /* Visualizzazione espansa - storico completo */
              <div className="max-h-96 overflow-y-auto space-y-2">
                {status.outputHistory && status.outputHistory.length > 0 ? (
                  status.outputHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      className="text-xs border-l-2 border-gray-300 pl-2 py-1"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-400">
                          {new Date(entry.timestamp).toLocaleTimeString('it-IT')}
                        </span>
                        {entry.toolName && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                            {entry.toolName}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 font-mono break-words">
                        {entry.output}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">Nessuno storico disponibile</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timestamp ricezione */}
        {status?.timestamp && (
          <div className="text-xs text-gray-400 text-right">
            Ricevuto: {formatTimestamp(status.timestamp)}
          </div>
        )}
      </div>

      {/* No data indicator */}
      {!status && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
          <p className="text-sm text-yellow-700">
            In attesa di dati...
          </p>
        </div>
      )}
    </div>
  );
}
