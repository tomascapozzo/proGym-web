"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_EXERCISE,
  type LibraryExercise,
  type RoutineCircuit,
  type RoutineDay,
  type RoutineDayExercise,
  type RoutineType,
  type RpePromptType,
} from "@/types/routine";

export function useRoutineCreator(onSaved: () => void) {
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const [createVisible, setCreateVisible] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newRoutineType, setNewRoutineType] = useState<RoutineType>("weekly");
  const [rpePrompt, setRpePrompt] = useState<RpePromptType>("sesion");
  const [newDays, setNewDays] = useState<RoutineDay[]>([]);
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [exPickerVisible, setExPickerVisible] = useState(false);
  const [exPickerDayIdx, setExPickerDayIdx] = useState(0);

  const [circuitExPickerVisible, setCircuitExPickerVisible] = useState(false);
  const [circuitExPickerTarget, setCircuitExPickerTarget] = useState<{
    dayIdx: number;
    circIdx: number;
  } | null>(null);

  // ─── Library ─────────────────────────────────────────────────────────────

  const ensureLibrary = async (): Promise<boolean> => {
    if (library.length > 0) return true;
    setLoadingLibrary(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, muscle_group, movement_pattern, equipment")
      .order("name", { ascending: true });
    setLoadingLibrary(false);
    if (error || !data) return false;
    setLibrary(data as LibraryExercise[]);
    return true;
  };

  // ─── Routine creation ─────────────────────────────────────────────────────

  const openCreateRoutine = () => {
    setNewRoutineName("");
    setNewRoutineType("weekly");
    setRpePrompt("sesion");
    setNewDays([]);
    setEditingDayIdx(null);
    setCreateVisible(true);
  };

  const changeRpePrompt = (value: RpePromptType) => {
    setRpePrompt(value);
    setNewDays((prev) =>
      prev.map((day) => ({
        ...day,
        ejercicios: day.ejercicios.map((ex) => ({ ...ex, rpe: value === "serie" })),
        circuitos: day.circuitos?.map((circ) => ({ ...circ, rpe: value === "bloque" })),
      })),
    );
  };

  const changeRoutineType = (type: RoutineType) => {
    setNewRoutineType(type);
    if (type === "daily") {
      setNewDays((prev) => {
        if (prev.length === 0) return [{ dia: "Día 1", enfoque: "", ejercicios: [] }];
        return prev.slice(0, 1);
      });
      setEditingDayIdx(0);
    }
  };

  const closeCreateRoutine = () => {
    setCreateVisible(false);
    setEditingRoutineId(null);
    setRpePrompt("sesion");
  };

  const openEditRoutine = async (id: string) => {
    const supabase = createClient();
    const [, { data: routine }] = await Promise.all([
      ensureLibrary(),
      supabase.from("routines").select("id, data, type").eq("id", id).single(),
    ]);
    if (!routine) return;
    const parsed = typeof routine.data === "string"
      ? JSON.parse(routine.data) as { nombre: string; dias: RoutineDay[]; rpe_prompt?: RpePromptType }
      : (routine.data as { nombre: string; dias: RoutineDay[]; rpe_prompt?: RpePromptType });
    setEditingRoutineId(id);
    setNewRoutineName(parsed.nombre ?? "");
    setNewRoutineType((routine.type as RoutineType) ?? "weekly");
    setRpePrompt(parsed.rpe_prompt ?? "sesion");
    setNewDays(parsed.dias ?? []);
    setEditingDayIdx(null);
    setSaveError(null);
    setCreateVisible(true);
  };

  const addDay = () => {
    setNewDays((prev) => [
      ...prev,
      { dia: `Día ${prev.length + 1}`, enfoque: "", ejercicios: [] },
    ]);
    setEditingDayIdx(newDays.length);
  };

  const updateDay = (dayIdx: number, field: "dia" | "enfoque", value: string) => {
    setNewDays((prev) => {
      const updated = [...prev];
      updated[dayIdx] = { ...updated[dayIdx], [field]: value };
      return updated;
    });
  };

  const removeDay = (dayIdx: number) => {
    setNewDays((prev) => prev.filter((_, i) => i !== dayIdx));
    if (editingDayIdx === dayIdx) setEditingDayIdx(null);
    else if (editingDayIdx !== null && editingDayIdx > dayIdx)
      setEditingDayIdx(editingDayIdx - 1);
  };

  const duplicateDay = (dayIdx: number) => {
    setNewDays((prev) => {
      const source = prev[dayIdx];
      const copy: RoutineDay = {
        ...source,
        dia: `${source.dia} (copia)`,
        ejercicios: source.ejercicios.map((ex) => ({ ...ex, reps: [...ex.reps], peso: ex.peso ? [...ex.peso] : undefined })),
        circuitos: source.circuitos?.map((c) => ({
          ...c,
          ejercicios: c.ejercicios.map((ex) => ({ ...ex, reps: [...ex.reps], peso: ex.peso ? [...ex.peso] : undefined })),
        })),
      };
      const updated = [...prev];
      updated.splice(dayIdx + 1, 0, copy);
      return updated;
    });
    setEditingDayIdx(dayIdx + 1);
  };

  const addExerciseToDay = (dayIdx: number, name: string) => {
    setNewDays((prev) => {
      const updated = [...prev];
      updated[dayIdx] = {
        ...updated[dayIdx],
        ejercicios: [
          ...updated[dayIdx].ejercicios,
          { ...DEFAULT_EXERCISE, nombre: name },
        ],
      };
      return updated;
    });
  };

  const updateExercise = (
    dayIdx: number,
    exIdx: number,
    field: keyof RoutineDayExercise,
    value: string | number,
  ) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const ejercicios = [...updated[dayIdx].ejercicios];
      ejercicios[exIdx] = { ...ejercicios[exIdx], [field]: value };
      updated[dayIdx] = { ...updated[dayIdx], ejercicios };
      return updated;
    });
  };

  const updateExerciseSeries = (dayIdx: number, exIdx: number, count: number) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const ejercicios = [...updated[dayIdx].ejercicios];
      const ex = ejercicios[exIdx];
      const currentReps = ex.reps;
      const newReps = Array.from(
        { length: count },
        (_, i) => currentReps[i] ?? currentReps[currentReps.length - 1] ?? "10",
      );
      const newPeso = ex.peso
        ? Array.from({ length: count }, (_, i) => (ex.peso as string[])[i] ?? "")
        : undefined;
      ejercicios[exIdx] = { ...ex, series: count, reps: newReps, peso: newPeso };
      updated[dayIdx] = { ...updated[dayIdx], ejercicios };
      return updated;
    });
  };

  const updateExercisePeso = (dayIdx: number, exIdx: number, seriesIdx: number, value: string) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const ejercicios = [...updated[dayIdx].ejercicios];
      const ex = ejercicios[exIdx];
      const base = ex.peso ?? Array.from({ length: ex.series }, () => "");
      const peso = base.map((p, i) => i >= seriesIdx ? value : p);
      ejercicios[exIdx] = { ...ex, peso };
      updated[dayIdx] = { ...updated[dayIdx], ejercicios };
      return updated;
    });
  };

  const updateExerciseRep = (dayIdx: number, exIdx: number, seriesIdx: number, value: string) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const ejercicios = [...updated[dayIdx].ejercicios];
      const reps = ejercicios[exIdx].reps.map((r, i) => i >= seriesIdx ? value : r);
      ejercicios[exIdx] = { ...ejercicios[exIdx], reps };
      updated[dayIdx] = { ...updated[dayIdx], ejercicios };
      return updated;
    });
  };

  const updateExerciseNota = (dayIdx: number, exIdx: number, value: string) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const ejercicios = [...updated[dayIdx].ejercicios];
      ejercicios[exIdx] = { ...ejercicios[exIdx], nota: value };
      updated[dayIdx] = { ...updated[dayIdx], ejercicios };
      return updated;
    });
  };

  const toggleExerciseRpe = (dayIdx: number, exIdx: number) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const ejercicios = [...updated[dayIdx].ejercicios];
      ejercicios[exIdx] = { ...ejercicios[exIdx], rpe: !ejercicios[exIdx].rpe };
      updated[dayIdx] = { ...updated[dayIdx], ejercicios };
      return updated;
    });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setNewDays((prev) => {
      const updated = [...prev];
      updated[dayIdx] = {
        ...updated[dayIdx],
        ejercicios: updated[dayIdx].ejercicios.filter((_, i) => i !== exIdx),
      };
      return updated;
    });
  };

  const openExPickerForDay = async (dayIdx: number) => {
    const ok = await ensureLibrary();
    if (!ok) return;
    setExPickerDayIdx(dayIdx);
    setExPickerVisible(true);
  };

  const pickExercise = (ex: LibraryExercise) => {
    addExerciseToDay(exPickerDayIdx, ex.name);
    setExPickerVisible(false);
  };

  const pickExercises = (exercises: LibraryExercise[]) => {
    exercises.forEach((ex) => addExerciseToDay(exPickerDayIdx, ex.name));
    setExPickerVisible(false);
  };

  const duplicateRoutine = async (id: string) => {
    const supabase = createClient();
    const [, { data: routine }] = await Promise.all([
      ensureLibrary(),
      supabase.from("routines").select("id, data, type").eq("id", id).single(),
    ]);
    if (!routine) return;
    const parsed = typeof routine.data === "string"
      ? JSON.parse(routine.data) as { nombre: string; dias: RoutineDay[]; rpe_prompt?: RpePromptType }
      : (routine.data as { nombre: string; dias: RoutineDay[]; rpe_prompt?: RpePromptType });
    setEditingRoutineId(null); // open as new — not editing
    setNewRoutineName(`Copia de ${parsed.nombre ?? ""}`);
    setNewRoutineType((routine.type as RoutineType) ?? "weekly");
    setRpePrompt(parsed.rpe_prompt ?? "sesion");
    setNewDays(parsed.dias ?? []);
    setEditingDayIdx(null);
    setSaveError(null);
    setCreateVisible(true);
  };

  // ─── Circuit creation ─────────────────────────────────────────────────────

  const addCircuit = (dayIdx: number) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const day = updated[dayIdx];
      updated[dayIdx] = {
        ...day,
        circuitos: [
          ...(day.circuitos ?? []),
          { nombre: "", rondas: 3, descanso: "90s", ejercicios: [] },
        ],
      };
      return updated;
    });
  };

  const updateCircuit = (
    dayIdx: number,
    circIdx: number,
    field: keyof RoutineCircuit,
    value: string | number,
  ) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      const circ = circuitos[circIdx];
      if (field === "rondas") {
        const count = value as number;
        const ejercicios = circ.ejercicios.map((ex) => ({
          ...ex,
          reps: Array.from({ length: count }, (_, i) => ex.reps[i] ?? ""),
          peso: ex.peso
            ? Array.from({ length: count }, (_, i) => (ex.peso as string[])[i] ?? "")
            : undefined,
        }));
        circuitos[circIdx] = { ...circ, rondas: count, ejercicios };
      } else {
        circuitos[circIdx] = { ...circ, [field]: value };
      }
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const removeCircuit = (dayIdx: number, circIdx: number) => {
    setNewDays((prev) => {
      const updated = [...prev];
      updated[dayIdx] = {
        ...updated[dayIdx],
        circuitos: (updated[dayIdx].circuitos ?? []).filter((_, i) => i !== circIdx),
      };
      return updated;
    });
  };

  const addExToCircuit = (dayIdx: number, circIdx: number, name: string) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      const rondas = circuitos[circIdx].rondas;
      circuitos[circIdx] = {
        ...circuitos[circIdx],
        ejercicios: [
          ...circuitos[circIdx].ejercicios,
          { nombre: name, reps: Array.from({ length: rondas }, () => "") },
        ],
      };
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const updateCircuitExRep = (
    dayIdx: number,
    circIdx: number,
    exIdx: number,
    seriesIdx: number,
    value: string,
  ) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      const ejercicios = [...circuitos[circIdx].ejercicios];
      const reps = ejercicios[exIdx].reps.map((r, i) => i >= seriesIdx ? value : r);
      ejercicios[exIdx] = { ...ejercicios[exIdx], reps };
      circuitos[circIdx] = { ...circuitos[circIdx], ejercicios };
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const updateCircuitExPeso = (
    dayIdx: number,
    circIdx: number,
    exIdx: number,
    seriesIdx: number,
    value: string,
  ) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      const ejercicios = [...circuitos[circIdx].ejercicios];
      const ex = ejercicios[exIdx];
      const base = ex.peso ?? Array.from({ length: circuitos[circIdx].rondas }, () => "");
      const peso = base.map((p, i) => i >= seriesIdx ? value : p);
      ejercicios[exIdx] = { ...ex, peso };
      circuitos[circIdx] = { ...circuitos[circIdx], ejercicios };
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const toggleCircuitRpe = (dayIdx: number, circIdx: number) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      circuitos[circIdx] = { ...circuitos[circIdx], rpe: !circuitos[circIdx].rpe };
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const updateCircuitExNota = (dayIdx: number, circIdx: number, exIdx: number, value: string) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      const ejercicios = [...circuitos[circIdx].ejercicios];
      ejercicios[exIdx] = { ...ejercicios[exIdx], nota: value };
      circuitos[circIdx] = { ...circuitos[circIdx], ejercicios };
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const toggleCircuitExRpe = (dayIdx: number, circIdx: number, exIdx: number) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      const ejercicios = [...circuitos[circIdx].ejercicios];
      ejercicios[exIdx] = { ...ejercicios[exIdx], rpe: !ejercicios[exIdx].rpe };
      circuitos[circIdx] = { ...circuitos[circIdx], ejercicios };
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const removeCircuitEx = (dayIdx: number, circIdx: number, exIdx: number) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      circuitos[circIdx] = {
        ...circuitos[circIdx],
        ejercicios: circuitos[circIdx].ejercicios.filter((_, i) => i !== exIdx),
      };
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const moveExercise = (dayIdx: number, exIdx: number, direction: "up" | "down") => {
    setNewDays((prev) => {
      const updated = [...prev];
      const ejercicios = [...updated[dayIdx].ejercicios];
      const targetIdx = direction === "up" ? exIdx - 1 : exIdx + 1;
      if (targetIdx < 0 || targetIdx >= ejercicios.length) return prev;
      [ejercicios[exIdx], ejercicios[targetIdx]] = [ejercicios[targetIdx], ejercicios[exIdx]];
      updated[dayIdx] = { ...updated[dayIdx], ejercicios };
      return updated;
    });
  };

  const moveCircuitEx = (
    dayIdx: number,
    circIdx: number,
    exIdx: number,
    direction: "up" | "down",
  ) => {
    setNewDays((prev) => {
      const updated = [...prev];
      const circuitos = [...(updated[dayIdx].circuitos ?? [])];
      const ejercicios = [...circuitos[circIdx].ejercicios];
      const targetIdx = direction === "up" ? exIdx - 1 : exIdx + 1;
      if (targetIdx < 0 || targetIdx >= ejercicios.length) return prev;
      [ejercicios[exIdx], ejercicios[targetIdx]] = [ejercicios[targetIdx], ejercicios[exIdx]];
      circuitos[circIdx] = { ...circuitos[circIdx], ejercicios };
      updated[dayIdx] = { ...updated[dayIdx], circuitos };
      return updated;
    });
  };

  const openCircuitExPicker = async (dayIdx: number, circIdx: number) => {
    const ok = await ensureLibrary();
    if (!ok) return;
    setCircuitExPickerTarget({ dayIdx, circIdx });
    setCircuitExPickerVisible(true);
  };

  const pickCircuitExercise = (ex: LibraryExercise) => {
    if (circuitExPickerTarget) {
      addExToCircuit(circuitExPickerTarget.dayIdx, circuitExPickerTarget.circIdx, ex.name);
    }
    setCircuitExPickerVisible(false);
  };

  const pickCircuitExercises = (exercises: LibraryExercise[]) => {
    if (circuitExPickerTarget) {
      exercises.forEach((ex) =>
        addExToCircuit(circuitExPickerTarget!.dayIdx, circuitExPickerTarget!.circIdx, ex.name),
      );
    }
    setCircuitExPickerVisible(false);
  };

  // ─── Save ─────────────────────────────────────────────────────────────────

  const saveRoutine = async () => {
    if (!newRoutineName.trim() || newDays.length === 0) return;
    const hasContent = newDays.some(
      (d) =>
        d.ejercicios.length > 0 ||
        (d.circuitos ?? []).some((c) => c.ejercicios.length > 0),
    );
    if (!hasContent) return;
    setSavingRoutine(true);
    setSaveError(null);
    const supabase = createClient();
    const payload = { nombre: newRoutineName.trim(), dias: newDays, rpe_prompt: rpePrompt };

    let error;
    if (editingRoutineId) {
      ({ error } = await supabase
        .from("routines")
        .update({ data: payload, type: newRoutineType })
        .eq("id", editingRoutineId));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveError("Sesión expirada. Volvé a iniciar sesión.");
        setSavingRoutine(false);
        return;
      }
      ({ error } = await supabase.from("routines").insert({
        user_id: user.id,
        data: payload,
        type: newRoutineType,
        status: "active",
      }));
    }

    setSavingRoutine(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setCreateVisible(false);
    setEditingRoutineId(null);
    setNewRoutineName("");
    setNewRoutineType("weekly");
    setRpePrompt("sesion");
    setNewDays([]);
    setEditingDayIdx(null);
    setSaveError(null);
    onSaved();
  };

  return {
    library,
    loadingLibrary,
    createVisible,
    editingRoutineId,
    saveError,
    newRoutineName,
    setNewRoutineName,
    newRoutineType,
    rpePrompt,
    setRpePrompt,
    changeRpePrompt,
    newDays,
    editingDayIdx,
    setEditingDayIdx,
    savingRoutine,
    exPickerVisible,
    setExPickerVisible,
    circuitExPickerVisible,
    setCircuitExPickerVisible,
    openCreateRoutine,
    openEditRoutine,
    closeCreateRoutine,
    changeRoutineType,
    addDay,
    updateDay,
    removeDay,
    duplicateDay,
    duplicateRoutine,
    updateExercise,
    updateExerciseSeries,
    updateExerciseRep,
    updateExercisePeso,
    updateExerciseNota,
    toggleExerciseRpe,
    removeExercise,
    openExPickerForDay,
    pickExercise,
    pickExercises,
    addCircuit,
    updateCircuit,
    removeCircuit,
    toggleCircuitRpe,
    updateCircuitExRep,
    updateCircuitExPeso,
    updateCircuitExNota,
    toggleCircuitExRpe,
    removeCircuitEx,
    moveExercise,
    moveCircuitEx,
    openCircuitExPicker,
    pickCircuitExercise,
    pickCircuitExercises,
    saveRoutine,
  };
}
