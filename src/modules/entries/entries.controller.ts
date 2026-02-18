import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { LedgerEntry } from './entities/ledger-entry.entity';

@Controller('v1/entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get()
  async list(): Promise<LedgerEntry[]> {
    return this.entriesService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEntryDto): Promise<LedgerEntry> {
    return this.entriesService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEntryDto,
  ): Promise<LedgerEntry> {
    return this.entriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.entriesService.remove(id);
  }

  @Post('import')
  async import(
    @Body() body: { entries: unknown[] },
  ): Promise<{
    created: number;
    failed: number;
    entries: LedgerEntry[];
    errors: string[];
  }> {
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    return this.entriesService.importEntries(entries);
  }
}
