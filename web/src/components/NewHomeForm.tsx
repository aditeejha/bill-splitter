import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { api, type Home } from '../lib/api'
import { queryKeys } from '../lib/queries'
import { Button, InlineError, inputClass } from './ui'

export function NewHomeForm({ onCreated }: { onCreated: (home: Home) => void }) {
  const inputId = useId()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const createHome = useMutation({
    mutationFn: (homeName: string) => api.createHome(homeName),
    onSuccess: (home) => {
      setName('')
      queryClient.invalidateQueries({ queryKey: queryKeys.homes })
      onCreated(home)
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim() === '') return
    createHome.mutate(name.trim())
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        New home name
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          className={inputClass}
          placeholder="Add a home"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="submit"
          loading={createHome.isPending}
          disabled={name.trim() === ''}
          aria-label="Create home"
        >
          {!createHome.isPending && <Plus className="size-4" aria-hidden />}
          <span className="hidden sm:inline">Create</span>
        </Button>
      </div>
      <InlineError message={createHome.isError ? createHome.error.message : null} />
    </form>
  )
}
