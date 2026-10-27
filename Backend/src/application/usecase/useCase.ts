export interface UseCase<InputDTO, OutputDTO>{
    execute(input: InputDTO): Promise<OutputDTO>
}