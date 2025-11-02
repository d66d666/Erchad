import { useState } from 'react'
import { Group } from '../types'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'

interface GroupSelectorProps {
  groups: Group[]
  selectedGroupId: string | null
  onSelectGroup: (groupId: string | null) => void
}

export function GroupSelector({
  groups,
  selectedGroupId,
  onSelectGroup,
}: GroupSelectorProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  const groupedByStage = groups.reduce((acc, group) => {
    if (!acc[group.stage]) {
      acc[group.stage] = []
    }
    acc[group.stage].push(group)
    return acc
  }, {} as Record<string, Group[]>)

  const toggleStage = (stage: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-bold text-gray-800 mb-3">المجموعات</h2>
      <div className="space-y-2">
        <button
          onClick={() => onSelectGroup(null)}
          className={`w-full px-4 py-2 rounded-lg text-right font-medium transition-colors ${
            selectedGroupId === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          جميع المجموعات
        </button>

        {Object.entries(groupedByStage).map(([stage, stageGroups]) => {
          const isExpanded = expandedStages.has(stage)
          return (
            <div key={stage} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleStage(stage)}
                className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 text-gray-800 font-semibold transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-slate-600" />
                  <span>{stage}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp size={18} className="text-slate-600" />
                ) : (
                  <ChevronDown size={18} className="text-slate-600" />
                )}
              </button>

              {isExpanded && (
                <div className="bg-gray-50 p-2 space-y-1">
                  {stageGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => onSelectGroup(group.id)}
                      className={`w-full px-4 py-2 rounded-lg text-right font-medium transition-colors ${
                        selectedGroupId === group.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
