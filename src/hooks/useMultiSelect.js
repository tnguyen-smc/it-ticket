import { useCallback, useState } from 'react'

export function useMultiSelect() {
  const [selected, setSelected] = useState([])
  const [lastClicked, setLastClicked] = useState(null)

  const handleSelect = useCallback(
    (id, e, orderedIds = []) => {
      if (e?.shiftKey && lastClicked) {
        const startIdx = orderedIds.indexOf(lastClicked)
        const endIdx = orderedIds.indexOf(id)
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
          const range = orderedIds.slice(from, to + 1)
          setSelected((prev) => Array.from(new Set([...prev, ...range])))
          return
        }
      }

      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
      setLastClicked(id)
    },
    [lastClicked]
  )

  const clearSelection = useCallback(() => {
    setSelected([])
    setLastClicked(null)
  }, [])

  return { selected, handleSelect, clearSelection }
}
