import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ObjectSchema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema) {}

  transform(value: any) {
    const { error, value: validatedValue } = this.schema.validate(value, {
      abortEarly: false,
    });

    if (error) {
      const errorMessages = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }

    return validatedValue;
  }
}
