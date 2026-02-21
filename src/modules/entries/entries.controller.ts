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
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../auth/entities/user.entity';

const LEDGER_ID_PATTERN = /^\d{6}$/;

@Controller('v1/entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get('savings-categories')
  getSavingsCategories(): string[] {
    return this.entriesService.getSavingsCategories();
  }

  @Get()
  async list(
    @Query('ledgerId') ledgerId: string,
    @CurrentUser() user: User,
  ): Promise<LedgerEntry[]> {
    if (!ledgerId || !LEDGER_ID_PATTERN.test(ledgerId)) {
      throw new BadRequestException('ledgerId는 6자리 숫자예요.');
    }
    return this.entriesService.findAll(user.id, ledgerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateEntryDto,
    @CurrentUser() user: User,
  ): Promise<LedgerEntry> {
    return this.entriesService.create(dto, user.id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEntryDto,
    @CurrentUser() user: User,
  ): Promise<LedgerEntry> {
    return this.entriesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.entriesService.remove(id, user.id);
  }

  @Post('import')
  async import(
    @Body() body: { ledgerId: string; entries: unknown[] },
    @CurrentUser() user: User,
  ): Promise<{
    created: number;
    failed: number;
    entries: LedgerEntry[];
    errors: string[];
  }> {
    const ledgerId = body?.ledgerId;
    if (!ledgerId || !LEDGER_ID_PATTERN.test(ledgerId)) {
      throw new BadRequestException('ledgerId는 6자리 숫자예요.');
    }
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    return this.entriesService.importEntries(entries, user.id, ledgerId);
  }
}
