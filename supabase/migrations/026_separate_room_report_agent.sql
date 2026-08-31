-- Agente dedicado para as revelações individuais por sala.
alter type public.ai_agent_kind add value if not exists 'room_report_analyzer';
