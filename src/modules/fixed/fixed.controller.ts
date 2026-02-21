import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FixedService } from './fixed.service';
import { CreateFixedEntryDto } from './dto/create-fixed-entry.dto';
import { UpdateFixedEntryDto } from './dto/update-fixed-entry.dto';
import { FixedEntry } from './entities/fixed-entry.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../auth/entities/user.entity';

const LEDGER_ID_PATTERN = /^\d{6}$/;

@Controller('v1/fixed-entries')
@UseGuards(JwtAuthGuard)
export class FixedController {
  constructor(private readonly fixedService: FixedService) {}

  /** 기본 카테고리 목록 (고정비 지출: 월세/관리비/…, 고정비 수입: 월급/부업). 사용자 추가 카테고리도 입력 가능 */
  @Get('categories')
  getCategories(): { expense: string[]; income: string[] } {
    return this.fixedService.getCategories();
  }

  /** 고정비 목록 (가계부별) */
  @Get()
  async list(
    @Query('ledgerId') ledgerId: string,
    @CurrentUser() user: User,
  ): Promise<FixedEntry[]> {
    if (!ledgerId || !LEDGER_ID_PATTERN.test(ledgerId)) {
      throw new BadRequestException('ledgerId는 6자리 숫자예요.');
    }
    return this.fixedService.findAll(user.id, ledgerId);
  }

  /** 고정비 추가 */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateFixedEntryDto,
    @CurrentUser() user: User,
  ): Promise<FixedEntry> {
    return this.fixedService.create(dto, user.id);
  }

  /** 고정비 수정 */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFixedEntryDto,
    @CurrentUser() user: User,
  ): Promise<FixedEntry> {
    return this.fixedService.update(id, dto, user.id);
  }

  /** 고정비 삭제 */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.fixedService.remove(id, user.id);
  }
}
