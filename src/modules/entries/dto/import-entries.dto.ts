import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateEntryDto } from './create-entry.dto';

export class ImportEntriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEntryDto)
  entries: CreateEntryDto[];
}
