package tn.sage.rh.user;

import org.mapstruct.Mapper;
import tn.sage.rh.employee.EmployeeMapper;

@Mapper(
        uses = {EmployeeMapper.class}
)
public interface UserMapper {
    UserDto toDTO(User user);
}
