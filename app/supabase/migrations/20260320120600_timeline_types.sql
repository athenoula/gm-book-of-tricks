-- Add location and battle block types to timeline
alter table timeline_blocks drop constraint timeline_blocks_block_type_check;
alter table timeline_blocks add constraint timeline_blocks_block_type_check
  check (block_type in ('scene', 'note', 'monster', 'npc', 'spell', 'location', 'battle'));
